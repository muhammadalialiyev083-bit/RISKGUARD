from rest_framework import serializers
from apps.core.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)
    actor_role = serializers.SerializerMethodField()

    def get_actor_role(self, obj):
        from django.contrib.auth import get_user_model
        snapshot = obj.actor_role_snapshot or (obj.actor.role if obj.actor else '')
        return dict(get_user_model().ROLE_CHOICES).get(snapshot, snapshot)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'organization', 'actor', 'actor_username', 'actor_role', 'actor_role_snapshot',
            'action', 'entity', 'entity_id', 'before_state', 'after_state',
            'timestamp', 'ip_address'
        ]
        read_only_fields = fields


class TenantModelSerializer(serializers.ModelSerializer):
    """Scope writable relations as well as top-level querysets to the tenant."""
    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            org_id = request.user.organization_id
            for field in fields.values():
                if not isinstance(field, serializers.PrimaryKeyRelatedField) or field.read_only:
                    continue
                qs = field.queryset
                if qs is None:
                    continue
                names = {f.name for f in qs.model._meta.fields}
                if 'organization' in names:
                    field.queryset = qs.filter(organization_id=org_id)
                elif qs.model.__name__ == 'Organization':
                    field.queryset = qs.filter(pk=org_id)
                elif 'risk' in names:
                    field.queryset = qs.filter(risk__organization_id=org_id)
                elif 'plan' in names:
                    field.queryset = qs.filter(plan__organization_id=org_id)
        return fields
