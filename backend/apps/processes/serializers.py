from apps.core.serializers import TenantModelSerializer
from rest_framework import serializers
from apps.processes.models import BusinessProcess, Asset, Dependency


class BusinessProcessSerializer(TenantModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    criticality_display = serializers.CharField(source='get_criticality_display', read_only=True)

    class Meta:
        model = BusinessProcess
        fields = [
            'id', 'organization', 'service', 'service_name', 'name', 'description',
            'owner', 'owner_name', 'criticality', 'criticality_display',
            'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


class AssetSerializer(TenantModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)

    class Meta:
        model = Asset
        fields = [
            'id', 'organization', 'name', 'type', 'type_display', 'description',
            'owner', 'owner_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


class DependencySerializer(TenantModelSerializer):
    def validate(self, attrs):
        request = self.context.get('request')
        if request:
            for side in ('from', 'to'):
                kind = attrs.get(side + '_type', getattr(self.instance, side + '_type', None))
                pk = attrs.get(side + '_id', getattr(self.instance, side + '_id', None))
                model = BusinessProcess if kind == 'PROCESS' else Asset
                if not model.objects.filter(pk=pk, organization=request.user.organization).exists():
                    raise serializers.ValidationError({side + '_id': 'Ushbu tashkilotda yozuv topilmadi.'})
            if (attrs.get('from_type', getattr(self.instance, 'from_type', None)), attrs.get('from_id', getattr(self.instance, 'from_id', None))) == (attrs.get('to_type', getattr(self.instance, 'to_type', None)), attrs.get('to_id', getattr(self.instance, 'to_id', None))):
                raise serializers.ValidationError('Tugun o‘ziga bog‘lanishi mumkin emas.')
        return attrs

    class Meta:
        model = Dependency
        fields = [
            'id', 'organization', 'from_type', 'from_id', 'to_type', 'to_id',
            'dependency_criticality', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']
