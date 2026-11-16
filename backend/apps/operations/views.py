"""Audited tenant-scoped operational resilience workflows."""
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import mixins, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from apps.authentication.permissions import IsTenantMember, IsAuditorReadOnly
from apps.core.audit import record_audit
from apps.operations.models import Provider, Incident, ImprovementTask, SimulationRun, IncidentEvent
from apps.operations.serializers import (
    ProviderSerializer, IncidentSerializer, ImprovementTaskSerializer, SimulationRunSerializer,
    IncidentEventSerializer, TimelineMessageSerializer, ProviderDisruptionSerializer, IncidentEscalationSerializer,
)
from apps.simulation.models import Scenario
from apps.simulation.simulator import ScenarioSimulator


class OperationsPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not getattr(request.user, 'organization_id', None):
            return False
        roles = getattr(view, 'write_roles', ['ADMIN', 'BCMS_MANAGER'])
        return request.user.is_superuser or request.user.role in roles


class TenantOperationsViewSet(viewsets.ModelViewSet):
    permission_classes = [IsTenantMember, IsAuditorReadOnly, OperationsPermission]
    write_roles = ['ADMIN', 'BCMS_MANAGER']

    def get_queryset(self):
        # Organization is the active, server-authorized context for every role.
        qs = self.queryset.filter(organization=self.request.user.organization, is_deleted=False)
        term = self.request.query_params.get('search', '').strip()
        if term:
            field = 'name' if self.queryset.model is Provider else 'title'
            qs = qs.filter(**{f'{field}__icontains': term})
        for field in ('status', 'severity', 'risk_rating', 'incident', 'owner', 'scenario'):
            value = self.request.query_params.get(field)
            if value and field in {f.name for f in self.queryset.model._meta.fields}:
                if field in ('incident', 'owner', 'scenario') and not value.isdigit():
                    raise ValidationError({field: 'Butun sonli ID kerak.'})
                qs = qs.filter(**{field: value})
        return qs

    def audit(self, obj, action_name, before=None):
        record_audit(request=self.request, action=action_name, entity=obj.__class__.__name__,
                     entity_id=obj.pk, before_state=before,
                     after_state=self.get_serializer(obj).data if action_name != 'DELETE' else {})

    def perform_create(self, serializer):
        with transaction.atomic():
            obj = serializer.save(organization=self.request.user.organization)
            self.audit(obj, 'CREATE')
            self.record_event(obj, 'CREATE')

    def perform_update(self, serializer):
        with transaction.atomic():
            before = dict(self.get_serializer(serializer.instance).data)
            obj = serializer.save()
            self.audit(obj, 'UPDATE', before)
            self.record_event(obj, 'UPDATE')

    def perform_destroy(self, instance):
        with transaction.atomic():
            before = dict(self.get_serializer(instance).data)
            instance.soft_delete()
            self.audit(instance, 'DELETE', before)
            self.record_event(instance, 'DELETE')

    def record_event(self, obj, event):
        incident = obj if isinstance(obj, Incident) else getattr(obj, 'incident', None)
        if incident:
            kind = 'Hodisa' if isinstance(obj, Incident) else 'Vazifa'
            IncidentEvent.objects.create(incident=incident, actor=self.request.user, event=event,
                message=f'{kind}: {obj.title} · {obj.get_status_display()}')


class ProviderViewSet(TenantOperationsViewSet):
    queryset = Provider.objects.prefetch_related('assets', 'services').select_related('owner')
    serializer_class = ProviderSerializer
    write_roles = ['ADMIN', 'BCMS_MANAGER', 'RISK_ANALYST']

    @action(detail=True, methods=['post'])
    def disruption(self, request, pk=None):
        provider = self.get_object()
        data = ProviderDisruptionSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        assets = list(provider.assets.filter(organization=provider.organization, is_deleted=False).values_list('id', flat=True))
        if not assets:
            raise ValidationError({'assets': 'Avval provayderga bog‘liq aktivlarni belgilang.'})
        with transaction.atomic():
            scenario = Scenario.objects.create(organization=provider.organization, title=data.validated_data['title'],
                description=f'Provayder uzilishi: {provider.name}', disrupted_asset_ids=assets,
                estimated_outage_hours=data.validated_data['estimated_outage_hours'])
            result = ScenarioSimulator.simulate(scenario)
            run = SimulationRun.objects.create(organization=provider.organization, scenario=scenario,
                                              created_by=request.user, result=result)
            record_audit(request=request, action='CREATE', entity='Scenario', entity_id=scenario.pk,
                         after_state={'title': scenario.title, 'provider_id': provider.pk})
            record_audit(request=request, action='SIMULATE', entity='SimulationRun', entity_id=run.pk,
                         after_state={'scenario_id': scenario.pk, 'affected_count': result['affected_processes_count']})
        return Response(SimulationRunSerializer(run, context={'request': request}).data, status=status.HTTP_201_CREATED)


class IncidentViewSet(TenantOperationsViewSet):
    queryset = Incident.objects.select_related('owner', 'provider').prefetch_related('tasks')
    serializer_class = IncidentSerializer

    def perform_create(self, serializer):
        # Creating a resolved record is supported, but its closure timestamp must be real.
        if serializer.validated_data.get('status') in ['RESOLVED', 'CLOSED']:
            serializer.validated_data['resolved_at'] = timezone.now()
        super().perform_create(serializer)

    def perform_update(self, serializer):
        next_status = serializer.validated_data.get('status', serializer.instance.status)
        if next_status in ['RESOLVED', 'CLOSED']:
            serializer.validated_data['resolved_at'] = serializer.instance.resolved_at or timezone.now()
        else:
            serializer.validated_data['resolved_at'] = None
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        # Retain connected history and require a conclusion instead of hiding active incidents.
        if instance.status != 'CLOSED':
            raise ValidationError({'status': 'Hodisani arxivlashdan avval yoping.'})
        super().perform_destroy(instance)

    @action(detail=True, methods=['post'])
    def escalate(self, request, pk=None):
        incident = self.get_object()
        payload = IncidentEscalationSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        with transaction.atomic():
            incident = Incident.objects.select_for_update().get(pk=incident.pk)
            if incident.status in ['RESOLVED', 'CLOSED']:
                raise ValidationError({'status': 'Yakunlangan hodisani eskalatsiya qilib bo‘lmaydi.'})
            severity = payload.validated_data['severity']
            if levels.index(severity) <= levels.index(incident.severity):
                raise ValidationError({'severity': 'Eskalatsiyada oldingidan yuqori darajani tanlang.'})
            before = dict(self.get_serializer(incident).data)
            previous = incident.severity
            incident.severity = severity
            incident.save(update_fields=['severity', 'updated_at'])
            event = IncidentEvent.objects.create(
                incident=incident, actor=request.user, event='ESCALATE',
                message=f"{previous} → {severity}: {payload.validated_data['reason']}")
            self.audit(incident, 'UPDATE', before)
        return Response({'incident': self.get_serializer(incident).data,
                         'event': IncidentEventSerializer(event).data})

    @action(detail=True, methods=['get', 'post'])
    def timeline(self, request, pk=None):
        incident = self.get_object()
        if request.method == 'POST':
            data = TimelineMessageSerializer(data=request.data)
            data.is_valid(raise_exception=True)
            with transaction.atomic():
                event = IncidentEvent.objects.create(incident=incident, actor=request.user, event='NOTE',
                                                     message=data.validated_data['message'])
                record_audit(request=request, action='UPDATE', entity='Incident', entity_id=incident.pk,
                             after_state={'timeline_event_id': event.pk})
            return Response(IncidentEventSerializer(event).data, status=status.HTTP_201_CREATED)
        return Response(IncidentEventSerializer(incident.timeline.select_related('actor'), many=True).data)


class ImprovementTaskViewSet(TenantOperationsViewSet):
    queryset = ImprovementTask.objects.select_related('owner', 'incident', 'scenario', 'simulation_run')
    serializer_class = ImprovementTaskSerializer
    write_roles = ['ADMIN', 'BCMS_MANAGER', 'RISK_ANALYST', 'PROCESS_OWNER']

    def perform_create(self, serializer):
        if self.request.user.role == 'PROCESS_OWNER' and not self.request.user.is_superuser:
            raise PermissionDenied('Vazifani menejer yaratadi; siz o‘zingizga biriktirilgan vazifani yangilashingiz mumkin.')
        super().perform_create(serializer)

    def perform_update(self, serializer):
        user = self.request.user
        if user.role == 'PROCESS_OWNER' and not user.is_superuser:
            if serializer.instance.owner_id != user.pk:
                raise PermissionDenied('Faqat o‘zingizga biriktirilgan vazifani yangilang.')
            if set(self.request.data) - {'status', 'description'}:
                raise PermissionDenied('Faqat bajarilish holati va izohni yangilashingiz mumkin.')
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        if self.request.user.role == 'PROCESS_OWNER' and not self.request.user.is_superuser:
            raise PermissionDenied('Vazifani faqat menejer arxivlaydi.')
        super().perform_destroy(instance)


class SimulationRunViewSet(mixins.CreateModelMixin, mixins.RetrieveModelMixin,
                           mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = SimulationRun.objects.select_related('scenario', 'created_by')
    serializer_class = SimulationRunSerializer
    permission_classes = [IsTenantMember, IsAuditorReadOnly, OperationsPermission]
    write_roles = ['ADMIN', 'BCMS_MANAGER', 'RISK_ANALYST']

    def get_queryset(self):
        qs = self.queryset.filter(organization=self.request.user.organization, is_deleted=False)
        scenario = self.request.query_params.get('scenario')
        if scenario:
            if not scenario.isdigit():
                raise ValidationError({'scenario': 'Butun sonli ID kerak.'})
            qs = qs.filter(scenario_id=scenario)
        return qs

    def perform_create(self, serializer):
        scenario = serializer.validated_data['scenario']
        result = ScenarioSimulator.simulate(scenario)
        with transaction.atomic():
            run = serializer.save(organization=self.request.user.organization,
                                  created_by=self.request.user, result=result)
            record_audit(request=self.request, action='SIMULATE', entity='SimulationRun', entity_id=run.pk,
                         after_state={'scenario_id': scenario.pk, 'affected_count': result['affected_processes_count']})

    @action(detail=True, methods=['post'])
    def improvements(self, request, pk=None):
        run = self.get_object()
        payload = dict(request.data)
        payload['simulation_run'] = run.pk
        payload['scenario'] = run.scenario_id
        serializer = ImprovementTaskSerializer(data=payload, context={'request': request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            task = serializer.save(organization=request.user.organization)
            record_audit(request=request, action='CREATE', entity='ImprovementTask', entity_id=task.pk,
                         after_state=serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
