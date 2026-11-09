from rest_framework import serializers
from apps.simulation.models import Scenario, Exercise


class ScenarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scenario
        fields = ['id', 'organization', 'title', 'description', 'disrupted_asset_ids', 'estimated_outage_hours', 'created_at', 'updated_at']
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


class ExerciseSerializer(serializers.ModelSerializer):
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
