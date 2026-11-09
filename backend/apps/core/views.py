from rest_framework import viewsets, permissions
from apps.core.models import AuditLog
from apps.core.serializers import AuditLogSerializer
from apps.authentication.permissions import IsTenantMember


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    FR-12: Audit jurnali (Immutable Read-Only View).
    Faqat joriy tashkilotga tegishli audit yozuvlarini qaytaradi.
    Tahrirlash va o'chirish bloklangan.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsTenantMember]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return AuditLog.objects.all()
        return AuditLog.objects.filter(organization=user.organization)
