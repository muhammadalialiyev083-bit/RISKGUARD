from apps.core.serializers import TenantModelSerializer
from rest_framework import serializers
from django.db import transaction
from apps.bia.models import BIAAssessment, BIAImpact


class BIAImpactSerializer(TenantModelSerializer):
    def validate(self, attrs):
        for field in ('operational_score', 'legal_score', 'reputational_score'):
            if field in attrs and not 1 <= attrs[field] <= 5:
                raise serializers.ValidationError({field: 'Ball 1 dan 5 gacha bo‘lishi shart.'})
        for field in ('horizon_hours', 'financial_loss'):
            if attrs.get(field, 0) < 0:
                raise serializers.ValidationError({field: 'Qiymat manfiy bo‘lishi mumkin emas.'})
        return attrs

    class Meta:
        model = BIAImpact
        fields = [
            'id', 'horizon_hours', 'financial_loss',
            'operational_score', 'legal_score', 'reputational_score'
        ]


class BIAAssessmentSerializer(TenantModelSerializer):
    process_name = serializers.CharField(source='process.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    has_rpo_gap = serializers.BooleanField(read_only=True)
    impacts = BIAImpactSerializer(many=True, required=False)

    class Meta:
        model = BIAAssessment
        fields = [
            'id', 'organization', 'process', 'process_name', 'revision',
            'mtpd_hours', 'rto_hours', 'rpo_minutes', 'backup_interval_minutes',
            'has_rpo_gap', 'status', 'approved_by', 'approved_by_name',
            'approved_at', 'comments', 'impacts', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'approved_by', 'approved_at', 'created_at', 'updated_at']

    def validate(self, attrs):
        status = attrs.get('status')
        if status and status != 'DRAFT' and status != getattr(self.instance, 'status', None):
            raise serializers.ValidationError({'status': 'Holatni yuborish yoki tasdiqlash amali orqali o‘zgartiring.'})
        if self.instance and self.instance.status == 'APPROVED' and status != 'DRAFT':
            raise serializers.ValidationError({'status': 'Tahrirlashdan oldin qoralama holatiga qaytaring.'})
        for field in ('rto_hours', 'mtpd_hours'):
            if field in attrs and attrs[field] <= 0:
                raise serializers.ValidationError({field: 'Vaqt noldan katta bo‘lishi shart.'})
        impacts = attrs.get('impacts', [])
        horizons = [i['horizon_hours'] for i in impacts]
        if len(horizons) != len(set(horizons)):
            raise serializers.ValidationError({'impacts': 'Vaqt gorizontlari takrorlanmasin.'})
        mtpd = attrs.get('mtpd_hours') or (self.instance.mtpd_hours if self.instance else None)
        rto = attrs.get('rto_hours') or (self.instance.rto_hours if self.instance else None)
        if rto is not None and mtpd is not None and rto > mtpd:
            raise serializers.ValidationError({
                'rto_hours': f"RTO ({rto}h) MTPD dan ({mtpd}h) katta bo'lishi mumkin emas. (RTO <= MTPD talabi)."
            })
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        impacts_data = validated_data.pop('impacts', [])
        bia = BIAAssessment.objects.create(**validated_data)
        for impact_data in impacts_data:
            BIAImpact.objects.create(bia=bia, **impact_data)
        return bia

    @transaction.atomic
    def update(self, instance, validated_data):
        impacts = validated_data.pop('impacts', None)
        if validated_data.get('status') == 'DRAFT':
            validated_data.update(approved_by=None, approved_at=None)
        instance = super().update(instance, validated_data)
        if impacts is not None:
            instance.impacts.all().delete()
            for values in impacts:
                BIAImpact.objects.create(bia=instance, **values)
        return instance
