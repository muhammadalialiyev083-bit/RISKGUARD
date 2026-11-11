from django.db import transaction
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from django.core.exceptions import ValidationError as ModelValidationError
from django.db import IntegrityError
from django.db.models.deletion import ProtectedError
from apps.core.audit import record_audit


class AuditedModelViewSet(viewsets.ModelViewSet):
    """Complete audit coverage for inherited CRUD hooks and safe list filtering."""
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except ModelValidationError as exc:
            raise ValidationError(getattr(exc, 'message_dict', exc.messages)) from exc
        except IntegrityError as exc:
            raise ValidationError({'detail': 'Yozuv takrorlangan yoki bog‘langan ma’lumot yaroqsiz.'}) from exc

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except ModelValidationError as exc:
            raise ValidationError(getattr(exc, 'message_dict', exc.messages)) from exc
        except IntegrityError as exc:
            raise ValidationError({'detail': 'Yozuv takrorlangan yoki bog‘langan ma’lumot yaroqsiz.'}) from exc

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError as exc:
            raise ValidationError({'detail': 'Yozuv tarix yoki bog‘langan vazifalarda ishlatilgan. Uni o‘chirish mumkin emas.'}) from exc

    def perform_update(self, serializer):
        before = dict(self.get_serializer(serializer.instance).data)
        instance = serializer.save()
        record_audit(request=self.request, action='UPDATE',
                     entity=instance.__class__.__name__, entity_id=instance.pk,
                     before_state=before, after_state=dict(self.get_serializer(instance).data))

    def perform_destroy(self, instance):
        before = dict(self.get_serializer(instance).data)
        record_audit(request=self.request, action='DELETE',
                     entity=instance.__class__.__name__, entity_id=instance.pk,
                     before_state=before)
        instance.delete()

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        names = {f.name for f in queryset.model._meta.fields}
        term = self.request.query_params.get('search', '').strip()
        if term:
            query = Q()
            for name in ('name', 'title', 'threat', 'description', 'comments'):
                if name in names:
                    query |= Q(**{name + '__icontains': term})
            if query:
                queryset = queryset.filter(query)
        for name in ('status', 'criticality', 'type', 'process', 'service', 'owner', 'plan', 'scenario'):
            value = self.request.query_params.get(name)
            if value and name in names:
                if name in ('process', 'service', 'owner', 'plan', 'scenario') and not value.isdigit():
                    continue
                queryset = queryset.filter(**{name: value})
        return queryset
