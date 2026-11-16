from apps.core.serializers import TenantModelSerializer
from rest_framework import serializers
from apps.simulation.models import Scenario, Exercise


class ScenarioSerializer(TenantModelSerializer):
    def validate_disrupted_asset_ids(self, values):
        from apps.processes.models import Asset
        if not isinstance(values, list) or any(type(pk) is not int for pk in values):
            raise serializers.ValidationError('Aktiv ID ro‘yxatini kiriting.')
        request = self.context.get('request')
        if request and Asset.objects.filter(organization=request.user.organization, pk__in=values).count() != len(set(values)):
            raise serializers.ValidationError('Ushbu tashkilotda aktiv topilmadi.')
        return list(dict.fromkeys(values))

    def validate_estimated_outage_hours(self, value):
        if value <= 0:
            raise serializers.ValidationError('Uzilish vaqti noldan katta bo‘lishi shart.')
        return value

    class Meta:
        model = Scenario
        fields = ['id', 'organization', 'title', 'description', 'disrupted_asset_ids', 'estimated_outage_hours', 'created_at', 'updated_at']
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


class ExerciseSerializer(TenantModelSerializer):
    plan_title = serializers.CharField(source='plan.title', read_only=True)
    outcome_display = serializers.CharField(source='get_outcome_display', read_only=True)

    class Meta:
        model = Exercise
        fields = [
            'id', 'organization', 'plan', 'plan_title', 'scenario',
            'exercise_date', 'actual_recovery_hours', 'outcome', 'outcome_display',
            'findings', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']
