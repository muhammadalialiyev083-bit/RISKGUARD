from decimal import Decimal
from rest_framework import serializers
from apps.operations.models import Provider, Incident, ImprovementTask, SimulationRun, IncidentEvent


class TenantRelationsSerializer(serializers.ModelSerializer):
    """Scope incoming foreign keys as well as outward object lookups."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request is None:
            return
        org = getattr(request.user, 'organization', None)
        # Even a platform superuser must explicitly use its current organization
        # when creating a tenant record; cross-tenant foreign keys are never valid.
        for field in self.fields.values():
            relation = field.child_relation if isinstance(field, serializers.ManyRelatedField) else field
            if hasattr(relation, 'queryset') and relation.queryset is not None:
                qs = relation.queryset
                if hasattr(qs.model, 'organization'):
                    qs = qs.filter(organization=org) if org else qs.none()
                if hasattr(qs.model, 'is_deleted'):
                    qs = qs.filter(is_deleted=False)
                if hasattr(qs.model, 'is_active'):
                    qs = qs.filter(is_active=True)
                relation.queryset = qs


class ProviderSerializer(TenantRelationsSerializer):
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    services_count = serializers.IntegerField(source='services.count', read_only=True)
    assets_count = serializers.IntegerField(source='assets.count', read_only=True)

    class Meta:
        model = Provider
        fields = ['id', 'organization', 'name', 'description', 'contact_email', 'owner', 'owner_name', 'services', 'assets', 'services_count', 'assets_count', 'risk_rating', 'next_review_date', 'created_at', 'updated_at']
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']
        validators = []  # Tenant uniqueness is checked below, without trusting submitted organization.

    def validate(self, data):
        org = self.context['request'].user.organization
        name = data.get('name', getattr(self.instance, 'name', None))
        qs = Provider.objects.filter(organization=org, name=name, is_deleted=False)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({'name': 'Bu nomdagi provayder mavjud.'})
        return data


class IncidentSerializer(TenantRelationsSerializer):
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    tasks_count = serializers.SerializerMethodField()
    open_tasks_count = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = ['id', 'organization', 'title', 'description', 'severity', 'status', 'owner', 'owner_name', 'provider', 'provider_name', 'asset', 'plan', 'scenario', 'conclusion', 'resolved_at', 'tasks_count', 'open_tasks_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'organization', 'resolved_at', 'created_at', 'updated_at']

    def get_tasks_count(self, obj):
        return obj.tasks.filter(is_deleted=False).count()

    def get_open_tasks_count(self, obj):
        return obj.tasks.filter(is_deleted=False).exclude(status='DONE').count()

    def validate(self, data):
        status = data.get('status', getattr(self.instance, 'status', 'OPEN'))
        if status in ['RESOLVED', 'CLOSED']:
            if not data.get('conclusion', getattr(self.instance, 'conclusion', '')).strip():
                raise serializers.ValidationError({'conclusion': 'Hodisani yakunlash uchun yakuniy xulosa kerak.'})
            if self.instance and self.instance.tasks.filter(is_deleted=False).exclude(status='DONE').exists():
                raise serializers.ValidationError({'status': 'Avval hodisaning ochiq vazifalarini bajaring.'})
        return data


class ImprovementTaskSerializer(TenantRelationsSerializer):
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    incident_title = serializers.CharField(source='incident.title', read_only=True)
    scenario_title = serializers.CharField(source='scenario.title', read_only=True)

    class Meta:
        model = ImprovementTask
        fields = ['id', 'organization', 'title', 'description', 'owner', 'owner_name', 'status', 'due_date', 'incident', 'incident_title', 'scenario', 'scenario_title', 'simulation_run', 'process', 'created_at', 'updated_at']
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']

    def validate(self, data):
        incident = data.get('incident', getattr(self.instance, 'incident', None))
        if incident and incident.status in ['RESOLVED', 'CLOSED']:
            raise serializers.ValidationError({'incident': 'Yakunlangan hodisaga vazifa qo‘shish yoki o‘zgartirish mumkin emas.'})
        run = data.get('simulation_run', getattr(self.instance, 'simulation_run', None))
        scenario = data.get('scenario', getattr(self.instance, 'scenario', None))
        if run:
            if scenario and scenario.pk != run.scenario_id:
                raise serializers.ValidationError({'scenario': 'Ssenariy simulyatsiya natijasiga mos emas.'})
            data['scenario'] = run.scenario
            process = data.get('process', getattr(self.instance, 'process', None))
            affected = {p['process_id'] for p in run.result.get('affected_processes', [])}
            if process and process.pk not in affected:
                raise serializers.ValidationError({'process': 'Bu jarayon tanlangan simulyatsiyada ta’sirlanmagan.'})
        return data


class SimulationRunSerializer(TenantRelationsSerializer):
    scenario_title = serializers.CharField(source='scenario.title', read_only=True)

    class Meta:
        model = SimulationRun
        fields = ['id', 'organization', 'scenario', 'scenario_title', 'created_by', 'result', 'created_at']
        read_only_fields = ['id', 'organization', 'created_by', 'result', 'created_at']


class IncidentEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.username', read_only=True)

    class Meta:
        model = IncidentEvent
        fields = ['id', 'actor', 'actor_name', 'event', 'message', 'created_at']
        read_only_fields = fields


class TimelineMessageSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=4000, allow_blank=False)


class ProviderDisruptionSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    estimated_outage_hours = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=Decimal('0.01'))


class IncidentEscalationSerializer(serializers.Serializer):
    severity = serializers.ChoiceField(choices=['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    reason = serializers.CharField(max_length=4000, allow_blank=False)
