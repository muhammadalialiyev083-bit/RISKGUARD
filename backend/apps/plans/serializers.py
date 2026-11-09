from rest_framework import serializers
from apps.plans.models import Strategy, ContinuityPlan, PlanStep


class StrategySerializer(serializers.ModelSerializer):
    process_name = serializers.CharField(source='process.name', read_only=True)

    class Meta:
        model = Strategy
        fields = [
            'id', 'organization', 'process', 'process_name', 'name', 'description',
            'estimated_rto_hours', 'estimated_rpo_minutes', 'estimated_cost',
            'is_selected', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


class PlanStepSerializer(serializers.ModelSerializer):
    assigned_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)

    class Meta:
        model = PlanStep
        fields = ['id', 'plan', 'sequence', 'title', 'description', 'assigned_to', 'assigned_name', 'expected_duration_minutes']
        read_only_fields = ['id']


class ContinuityPlanSerializer(serializers.ModelSerializer):
    process_name = serializers.CharField(source='process.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    steps = PlanStepSerializer(many=True, required=False)

    class Meta:
        model = ContinuityPlan
        fields = [
            'id', 'organization', 'process', 'process_name', 'title', 'version',
            'scope', 'status', 'status_display', 'approved_by', 'approved_by_name',
            'approved_at', 'steps', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'approved_by', 'approved_at', 'created_at', 'updated_at']

    def create(self, validated_data):
        steps_data = validated_data.pop('steps', [])
        plan = ContinuityPlan.objects.create(**validated_data)
        for s in steps_data:
            PlanStep.objects.create(plan=plan, **s)
        return plan
