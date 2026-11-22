from apps.core.serializers import TenantModelSerializer
from rest_framework import serializers
from apps.simulation.models import Scenario, Exercise
from apps.processes.models import Asset


class ScenarioSerializer(TenantModelSerializer):
    backup_assets = serializers.DictField(
        child=serializers.IntegerField(min_value=1), source='available_resources.backup_assets',
        required=False, default=dict,
    )

    def validate_disrupted_asset_ids(self, values):
        if not isinstance(values, list) or any(type(pk) is not int for pk in values):
            raise serializers.ValidationError('Aktiv ID ro‘yxatini kiriting.')
        request = self.context.get('request')
        if request and Asset.objects.filter(organization=request.user.organization, pk__in=values).count() != len(set(values)):
            raise serializers.ValidationError('Ushbu tashkilotda aktiv topilmadi.')
        return list(dict.fromkeys(values))

    def validate(self, data):
        previous = self.instance.available_resources if self.instance else {}
        if not isinstance(previous, dict):
            previous = {}
        resources = data.get('available_resources', {})
        backups = resources.get('backup_assets', previous.get('backup_assets', {}))
        disrupted = set(data.get('disrupted_asset_ids', self.instance.disrupted_asset_ids if self.instance else []) or [])
        ids = {str(pk) for pk in disrupted}
        if not isinstance(backups, dict) or any(key not in ids or value in disrupted for key, value in backups.items()):
            raise serializers.ValidationError({'backup_assets': 'Uzilgan aktiv uchun ishlaydigan boshqa zaxira aktivini tanlang.'})
        request = self.context.get('request')
        if request and Asset.objects.active().filter(organization=request.user.organization, pk__in=backups.values()).count() != len(set(backups.values())):
            raise serializers.ValidationError({'backup_assets': 'Zaxira aktivi tashkilotga tegishli bo‘lishi kerak.'})
        if resources:
            data['available_resources'] = {**previous, **resources}
        return data

    def validate_estimated_outage_hours(self, value):
        if value <= 0:
            raise serializers.ValidationError('Uzilish vaqti noldan katta bo‘lishi shart.')
        return value

    class Meta:
        model = Scenario
        fields = ['id', 'organization', 'title', 'description', 'disrupted_asset_ids', 'backup_assets', 'estimated_outage_hours', 'created_at', 'updated_at']
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']


class ExerciseSerializer(TenantModelSerializer):
    plan_title = serializers.CharField(source='plan.title', read_only=True)
    outcome_display = serializers.CharField(source='get_outcome_display', read_only=True)
    plan_version = serializers.CharField(source='plan.version', read_only=True)

    class Meta:
        model = Exercise
        fields = [
            'id', 'organization', 'plan', 'plan_title', 'plan_version', 'scenario',
            'exercise_date', 'actual_recovery_hours', 'outcome', 'outcome_display',
            'findings', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']
