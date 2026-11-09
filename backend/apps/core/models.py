import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import PermissionDenied


class AuditLog(models.Model):
    """
    FR-12: Audit jurnali (Immutable Ledger).
    Kim/qachon/nimani o'zgartirganini qayd qiladi.
    Hech qachon o'chirib yoki tahrirlab bo'lmaydi.
    """
    ACTION_CHOICES = [
        ('CREATE', 'Yaratish'),
        ('UPDATE', 'Tahrirlash'),
        ('DELETE', 'O\'chirish'),
        ('LOGIN', 'Tizimga kirish'),
        ('LOGOUT', 'Tizimdan chiqish'),
        ('APPROVE', 'Tasdiqlash'),
        ('SIMULATE', 'Simulyatsiya'),
        ('EXPORT', 'Hujjat eksporti'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_actions'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    entity = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100, blank=True)
    before_state = models.JSONField(default=dict, blank=True)
    after_state = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['organization', 'timestamp']),
            models.Index(fields=['entity', 'entity_id']),
        ]

    def save(self, *args, **kwargs):
        if self.pk and AuditLog.objects.filter(pk=self.pk).exists():
            raise PermissionDenied("Audit log yozuvlarini tahrirlash qat'iyan taqiqlangan.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionDenied("Audit log yozuvlarini o'chirish qat'iyan taqiqlangan.")

    def __str__(self):
        actor_name = self.actor.username if self.actor else "Tizim"
        return f"[{self.timestamp:%Y-%m-%d %H:%M:%S}] {actor_name} - {self.action} on {self.entity} ({self.entity_id})"


class TenantQuerySet(models.QuerySet):
    def for_tenant(self, organization):
        if organization is None:
            return self.none()
        return self.filter(organization=organization)

    def active(self):
        return self.filter(is_deleted=False)


class TenantManager(models.Manager):
    def get_queryset(self):
        return TenantQuerySet(self.model, using=self._db)

    def for_tenant(self, organization):
        return self.get_queryset().for_tenant(organization)

    def active(self):
        return self.get_queryset().active()


class BaseTenantModel(models.Model):
    """
    Barcha tashkilotga bog'liq modellar uchun asosiy sinf.
    Multi-tenancy ma'lumot izolatsiyasi va soft-delete ta'minlaydi.
    """
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_set"
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = TenantManager()

    class Meta:
        abstract = True

    def soft_delete(self):
        self.is_deleted = True
        self.save(update_fields=['is_deleted', 'updated_at'])
