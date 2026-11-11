from django.db import models
from apps.core.duration_fields import synchronize_seconds
from django.conf import settings
from apps.core.models import BaseTenantModel
from apps.processes.models import BusinessProcess


class Strategy(BaseTenantModel):
    """
    FR-08: Tiklash strategiyasi varianti.
    Masalan: Zaxira serverga o'tish (RTO=2h, RPO=30m, narxi=15000000).
    """
    process = models.ForeignKey(BusinessProcess, on_delete=models.CASCADE, related_name='strategies')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    estimated_rto_hours = models.DecimalField(max_digits=6, decimal_places=2)
    estimated_rpo_minutes = models.PositiveIntegerField()
    estimated_cost = models.DecimalField(max_digits=18, decimal_places=2, default=0.00)
    is_selected = models.BooleanField(default=False)

    kind = models.CharField(max_length=30, blank=True, default='')
    conditions = models.TextField(blank=True, default='')
    preparation_minutes = models.PositiveIntegerField(default=0)
    recovery_seconds = models.PositiveBigIntegerField(default=0, editable=False)
    rpo_seconds = models.PositiveBigIntegerField(default=0, editable=False)
    staff_required = models.PositiveIntegerField(default=1)
    resource_requirements = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(estimated_cost__gte=0,
                       estimated_rto_hours__gt=0, staff_required__gte=1), name='strategy_valid_limits')]
        ordering = ['estimated_cost']

    def save(self, *args, **kwargs):
        synchronize_seconds(self, kwargs, [('estimated_rto_hours', 'recovery_seconds', 3600),
                                          ('estimated_rpo_minutes', 'rpo_seconds', 60)])
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} (RTO: {self.estimated_rto_hours}h, Cost: {self.estimated_cost})"


class ContinuityPlan(BaseTenantModel):
    """
    FR-09: BCP / DRP Uzluksizlik rejalari.
    Versiyalangan, qadamlar ketma-ketligi, mas'ullar va tasdiqlash holati.
    """
    STATUS_CHOICES = [
        ('DRAFT', 'Qoralama'),
        ('IN_REVIEW', 'Ko\'rib chiqilmoqda'),
        ('APPROVED', 'Tasdiqlangan'),
        ('PUBLISHED', 'E\'lon qilingan'),
        ('ARCHIVED', 'Arxivlangan'),
    ]

    process = models.ForeignKey(BusinessProcess, on_delete=models.CASCADE, related_name='continuity_plans')
    title = models.CharField(max_length=255)
    version = models.CharField(max_length=20, default='1.0')
    scope = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_plans'
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    activation_conditions = models.TextField(blank=True, default='')
    contacts = models.TextField(blank=True, default='')
    temporary_procedures = models.TextField(blank=True, default='')
    verification_criteria = models.TextField(blank=True, default='')
    return_to_normal = models.TextField(blank=True, default='')
    review_due_date = models.DateField(null=True, blank=True)
    previous_version = models.ForeignKey('self', null=True, blank=True, on_delete=models.PROTECT, related_name='later_versions')
    # Retain the historical scheduler reference without inventing its lost engine.
    legacy_schedule_run_id = models.BigIntegerField(db_column='schedule_run_id', null=True, blank=True, editable=False)
    snapshot = models.JSONField(default=dict, blank=True, editable=False)

    class Meta:
        ordering = ['-version', '-created_at']

    @property
    def is_frozen(self):
        return bool(self.snapshot) or self.status in ('APPROVED', 'PUBLISHED', 'ARCHIVED')

    def __str__(self):
        return f"{self.title} (v{self.version}) - {self.get_status_display()}"


class PlanStep(models.Model):
    """
    FR-09: BCP/DRP rejasidagi aniq bosqichlar/harakatlar.
    """
    plan = models.ForeignKey(ContinuityPlan, on_delete=models.CASCADE, related_name='steps')
    sequence = models.PositiveSmallIntegerField(default=1)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_plan_steps'
    )
    expected_duration_minutes = models.PositiveIntegerField(default=30)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(sequence__gte=1), name='plan_step_positive_sequence'),
            models.UniqueConstraint(fields=['plan', 'sequence'], name='plan_step_unique_sequence'),
        ]
        ordering = ['sequence']

    def __str__(self):
        return f"{self.plan.title} - Qadam {self.sequence}: {self.title}"
