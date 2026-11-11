from apps.core.serializers import TenantModelSerializer
from rest_framework import serializers
from django.db import transaction
from apps.plans.models import Strategy, ContinuityPlan, PlanStep


class StrategySerializer(TenantModelSerializer):
    process_name = serializers.CharField(source='process.name', read_only=True)

    class Meta:
        model = Strategy
        fields = [
            'id', 'organization', 'process', 'process_name', 'name', 'description',
            'estimated_rto_hours', 'estimated_rpo_minutes', 'estimated_cost',
            'is_selected', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


class PlanStepSerializer(TenantModelSerializer):
    assigned_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)

    class Meta:
        model = PlanStep
        fields = ['id', 'plan', 'sequence', 'title', 'description', 'assigned_to', 'assigned_name', 'expected_duration_minutes']
        read_only_fields = ['id', 'plan']


class ContinuityPlanSerializer(TenantModelSerializer):
    process_name = serializers.CharField(source='process.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_frozen = serializers.BooleanField(read_only=True)
    steps = PlanStepSerializer(many=True, required=False)

    class Meta:
        model = ContinuityPlan
        fields = [
            'id', 'organization', 'process', 'process_name', 'title', 'version',
            'scope', 'status', 'status_display', 'approved_by', 'approved_by_name',
            'approved_at', 'steps', 'is_frozen', 'previous_version', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'approved_by', 'approved_at', 'previous_version', 'created_at', 'updated_at']

    def validate(self, attrs):
        status = attrs.get('status')
        if status and status != 'DRAFT' and status != getattr(self.instance, 'status', None):
            raise serializers.ValidationError({'status': 'Holatni yuborish yoki e’lon qilish amali orqali o‘zgartiring.'})
        if self.instance and self.instance.is_frozen:
            raise serializers.ValidationError({'status': 'Tasdiqlangan versiya saqlanadi. Tahrirlash uchun yangi versiya yarating.'})
        steps = attrs.get('steps', [])
        sequences = [s.get('sequence', 1) for s in steps]
        if len(sequences) != len(set(sequences)):
            raise serializers.ValidationError({'steps': 'Qadam tartib raqamlari takrorlanmasin.'})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        steps_data = validated_data.pop('steps', [])
        plan = ContinuityPlan.objects.create(**validated_data)
        for s in steps_data:
            PlanStep.objects.create(plan=plan, **s)
        return plan

    @transaction.atomic
    def update(self, instance, validated_data):
        steps = validated_data.pop('steps', None)
        if validated_data.get('status') == 'DRAFT':
            validated_data.update(approved_by=None, approved_at=None)
        instance = super().update(instance, validated_data)
        if steps is not None:
            instance.steps.all().delete()
            for values in steps:
                PlanStep.objects.create(plan=instance, **values)
        return instance
