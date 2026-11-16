from rest_framework import viewsets, permissions
from apps.core.models import AuditLog
from apps.core.serializers import AuditLogSerializer
from apps.authentication.permissions import IsTenantMember
from django.db.models import Q
from rest_framework.exceptions import ValidationError
from django.utils.dateparse import parse_date


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
            qs = AuditLog.objects.all()
        else:
            qs = AuditLog.objects.filter(organization=user.organization)
        for field in ('action', 'entity', 'entity_id'):
            if self.request.query_params.get(field):
                qs = qs.filter(**{field: self.request.query_params[field]})
        if self.request.query_params.get('search'):
            term = self.request.query_params['search']
            qs = qs.filter(Q(actor__username__icontains=term) | Q(entity__icontains=term))
        for param, lookup in [('from', 'timestamp__date__gte'), ('to', 'timestamp__date__lte')]:
            value = self.request.query_params.get(param)
            if value:
                try:
                    valid_date = parse_date(value)
                except ValueError:
                    valid_date = None
                if not valid_date:
                    raise ValidationError({param: 'YYYY-MM-DD sanasini kiriting.'})
                qs = qs.filter(**{lookup: value})
        return qs.select_related('actor')
