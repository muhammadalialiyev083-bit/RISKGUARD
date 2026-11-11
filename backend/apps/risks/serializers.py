from apps.core.serializers import TenantModelSerializer
from rest_framework import serializers
from apps.risks.models import Risk, Control


class ControlSerializer(TenantModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Control
        fields = ['id', 'risk', 'title', 'description', 'status', 'status_display', 'effectiveness_evidence', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class RiskSerializer(TenantModelSerializer):
    def validate(self, attrs):
        for field in ('likelihood', 'impact', 'likelihood_residual', 'impact_residual'):
            value = attrs.get(field)
            if value is not None and not 1 <= value <= 5:
                raise serializers.ValidationError({field: 'Qiymat 1 dan 5 gacha bo‘lishi shart.'})
        return attrs

    process_name = serializers.CharField(source='process.name', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    risk_score = serializers.IntegerField(read_only=True)
    residual_risk_score = serializers.IntegerField(read_only=True)
    risk_reduction = serializers.IntegerField(read_only=True)
    risk_class = serializers.SerializerMethodField()
    controls = ControlSerializer(many=True, read_only=True)

    class Meta:
        model = Risk
        fields = [
            'id', 'organization', 'process', 'process_name', 'asset', 'asset_name',
            'threat', 'vulnerability', 'likelihood', 'impact',
            'likelihood_residual', 'impact_residual', 'risk_score', 'residual_risk_score',
            'risk_reduction', 'risk_class', 'owner', 'status', 'controls'
        ]
        read_only_fields = ['id', 'organization', 'risk_score', 'residual_risk_score', 'risk_reduction', 'risk_class']

    def get_risk_class(self, obj):
        org = obj.organization
        low = org.risk_low_threshold if org else 6
        med = org.risk_medium_threshold if org else 14
        return obj.get_risk_class(low_thresh=low, med_thresh=med)
