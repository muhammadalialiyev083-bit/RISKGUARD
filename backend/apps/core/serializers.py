from rest_framework import serializers
from apps.core.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)
    actor_role = serializers.CharField(source='actor.get_role_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'organization', 'actor', 'actor_username', 'actor_role',
            'action', 'entity', 'entity_id', 'before_state', 'after_state',
            'timestamp', 'ip_address'
        ]
        read_only_fields = fields
