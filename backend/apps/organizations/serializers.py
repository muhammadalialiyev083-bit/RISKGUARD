from apps.core.serializers import TenantModelSerializer
from rest_framework import serializers
from apps.organizations.models import Organization, Department, Service


class OrganizationSerializer(TenantModelSerializer):
    def validate(self, attrs):
        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
        low = attrs.get('risk_low_threshold', getattr(self.instance, 'risk_low_threshold', 6))
        medium = attrs.get('risk_medium_threshold', getattr(self.instance, 'risk_medium_threshold', 14))
        if not 1 <= low < medium <= 24:
            raise serializers.ValidationError({'risk_medium_threshold': 'Chegaralar 1 ≤ past < o‘rta ≤ 24 bo‘lishi shart.'})
        if 'max_acceptable_loss' in attrs and attrs['max_acceptable_loss'] <= 0:
            raise serializers.ValidationError({'max_acceptable_loss': 'Maksimal zarar noldan katta bo‘lishi shart.'})
        if 'timezone' in attrs:
            try:
                ZoneInfo(attrs['timezone'])
            except (ZoneInfoNotFoundError, ValueError):
                raise serializers.ValidationError({'timezone': 'Yaroqli vaqt mintaqasini kiriting.'})
        return attrs

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'sector', 'timezone',
            'max_acceptable_loss', 'risk_low_threshold', 'risk_medium_threshold',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DepartmentSerializer(TenantModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'organization', 'name', 'head_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


class ServiceSerializer(TenantModelSerializer):
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)

    class Meta:
        model = Service
        fields = ['id', 'organization', 'name', 'description', 'owner', 'owner_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']
