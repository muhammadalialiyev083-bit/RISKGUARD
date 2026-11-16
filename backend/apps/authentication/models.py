from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """
    FR-01: Foydalanuvchilar va rollar.
    Texnik topshiriqning 5-bo'limidagi 6 ta rolga muvofiq:
    ADMIN, BCMS_MANAGER, PROCESS_OWNER, RISK_ANALYST, APPROVER, AUDITOR.
    """
    ROLE_ADMIN = 'ADMIN'
    ROLE_BCMS_MANAGER = 'BCMS_MANAGER'
    ROLE_PROCESS_OWNER = 'PROCESS_OWNER'
    ROLE_RISK_ANALYST = 'RISK_ANALYST'
    ROLE_APPROVER = 'APPROVER'
    ROLE_AUDITOR = 'AUDITOR'

    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Administrator'),
        (ROLE_BCMS_MANAGER, 'BCMS menejeri'),
        (ROLE_PROCESS_OWNER, 'Jarayon egasi'),
        (ROLE_RISK_ANALYST, 'Risk tahlilchisi'),
        (ROLE_APPROVER, 'Rahbariyat / Tasdiqlovchi'),
        (ROLE_AUDITOR, 'Auditor / Kuzatuvchi'),
    ]

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='users',
        help_text="Foydalanuvchi biriktirilgan tashkilot (Multi-tenant izolatsiyasi uchun)"
    )
    department = models.ForeignKey(
        'organizations.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_PROCESS_OWNER,
        help_text="RBAC ruxsatlar modeli bo'yicha rol"
    )
    phone = models.CharField(max_length=30, blank=True)
    preferences = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['username']

    def __str__(self):
        org_name = self.organization.name if self.organization else "Superadmin"
        return f"{self.username} ({self.get_role_display()} - {org_name})"

    @property
    def is_org_admin(self):
        return self.role == self.ROLE_ADMIN or self.is_superuser

    @property
    def is_bcms_manager(self):
        return self.role in [self.ROLE_ADMIN, self.ROLE_BCMS_MANAGER] or self.is_superuser

    @property
    def is_approver(self):
        return self.role in [self.ROLE_ADMIN, self.ROLE_APPROVER] or self.is_superuser

    @property
    def is_auditor(self):
        return self.role == self.ROLE_AUDITOR


class GoogleIdentity(models.Model):
    """A verified Google subject explicitly linked by its signed-in owner."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='google_identity')
    subject = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)


class AuthRateLimit(models.Model):
    """Shared, short-lived counters; neither email addresses nor tokens are stored."""
    key = models.CharField(max_length=64, primary_key=True)
    attempts = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(db_index=True)
