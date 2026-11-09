from django.db import models
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

    class Meta:
        ordering = ['estimated_cost']

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

    class Meta:
        ordering = ['-version', '-created_at']

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
        ordering = ['sequence']

    def __str__(self):
        return f"{self.plan.title} - Qadam {self.sequence}: {self.title}"
