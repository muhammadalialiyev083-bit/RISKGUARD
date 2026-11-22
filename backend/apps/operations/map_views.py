import math

from django.db import transaction
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.permissions import IsAuditorReadOnly, IsTenantMember
from apps.core.audit import record_audit
from apps.operations.models import ContinuityMap, Provider
from apps.operations.views import OperationsPermission
from apps.organizations.models import Organization
from apps.plans.models import ContinuityPlan
from apps.processes.models import Asset


MAP_RESOURCES = {'assets': Asset, 'providers': Provider, 'plans': ContinuityPlan}


class MapLinkSerializer(serializers.Serializer):
    resource = serializers.ChoiceField(choices=tuple(MAP_RESOURCES))
    id = serializers.IntegerField(min_value=1)


class MapStopSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=80)
    name = serializers.CharField(max_length=60)
    kind = serializers.ChoiceField(choices=('office', 'backup', 'partner'))
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    latitude = serializers.FloatField(min_value=-85, max_value=85)
    link = MapLinkSerializer(required=False, allow_null=True)


class ContinuityMapSerializer(serializers.Serializer):
    version = serializers.ChoiceField(choices=(1,))
    revision = serializers.IntegerField(min_value=0)
    stops = MapStopSerializer(many=True, max_length=20)

    def validate_stops(self, stops):
        organization = self.context['request'].user.organization
        ids = [stop['id'] for stop in stops]
        if len(set(ids)) != len(ids):
            raise serializers.ValidationError('Manzil identifikatorlari takrorlanmasin.')
        for stop in stops:
            if not all(math.isfinite(stop[axis]) for axis in ('longitude', 'latitude')):
                raise serializers.ValidationError('Koordinatalar sonli bo‘lishi kerak.')
            link = stop.get('link')
            if link and not MAP_RESOURCES[link['resource']].objects.active().filter(
                organization=organization, pk=link['id'],
            ).exists():
                raise serializers.ValidationError('Bog‘langan yozuv ushbu tashkilotda topilmadi.')
        return stops


class ContinuityMapView(APIView):
    permission_classes = [IsTenantMember, IsAuditorReadOnly, OperationsPermission]

    def get(self, request):
        plan = ContinuityMap.objects.filter(organization=request.user.organization).first()
        return Response({'version': 1, 'revision': plan.revision if plan else 0, 'stops': plan.stops if plan else []})

    @transaction.atomic
    def put(self, request):
        organization = Organization.objects.select_for_update().get(pk=request.user.organization_id)
        serializer = ContinuityMapSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        plan, created = ContinuityMap.objects.get_or_create(organization=organization)
        if data['revision'] != plan.revision:
            transaction.set_rollback(True)
            return Response({'detail': 'Xarita boshqa oynada yangilangan. Qayta yuklang.',
                             'revision': plan.revision}, status=409)
        before = {'revision': plan.revision, 'stop_count': len(plan.stops)}
        plan.stops = data['stops']
        plan.revision += 1
        plan.save(update_fields=['stops', 'revision'])
        record_audit(request=request, action='CREATE' if created else 'UPDATE', entity='ContinuityMap',
                     entity_id=plan.pk, before_state=before,
                     after_state={'revision': plan.revision, 'stop_count': len(plan.stops)})
        return Response({'version': 1, 'revision': plan.revision, 'stops': plan.stops})
