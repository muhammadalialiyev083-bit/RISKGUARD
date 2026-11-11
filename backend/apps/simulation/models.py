from django.db import models
from apps.core.duration_fields import synchronize_seconds
from django.conf import settings
from apps.core.models import BaseTenantModel
from apps.plans.models import ContinuityPlan


class Scenario(BaseTenantModel):
    """
    FR-10: Nosozlik / Falokat ssenariysi.
    Tahdid, ishdan chiqqan aktivlar ro'yxati va taxminiy uzilish davomiyligi.
    """
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    disrupted_asset_ids = models.JSONField(default=list, help_text="Ishdan chiqqan aktivlar ID lari [1, 2, ...]")
    estimated_outage_hours = models.DecimalField(max_digits=6, decimal_places=2, default=8.0)

    available_resources = models.JSONField(default=dict, blank=True)
    recovery_options = models.JSONField(default=dict, blank=True)
    event_time = models.DateTimeField(null=True, blank=True)
    is_synthetic = models.BooleanField(default=False)
    kind = models.CharField(max_length=30, blank=True, default='')
    outage_seconds = models.PositiveBigIntegerField(default=0, editable=False)

    class Meta:
        ordering = ['title']

    def save(self, *args, **kwargs):
        synchronize_seconds(self, kwargs, [('estimated_outage_hours', 'outage_seconds', 3600)])
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} (Outage: {self.estimated_outage_hours}h)"


class Exercise(BaseTenantModel):
    """
    FR-13: Mashqlar va sinovlar (BCP test).
    Mashq sanasi, real tiklash vaqti va kamchiliklar xulosasi.
    """
    OUTCOME_CHOICES = [
        ('SUCCESS', 'Muvaffaqiyatli'),
        ('PARTIAL', 'Qisman muvaffaqiyatli'),
        ('FAILED', 'Muvaffaqiyatsiz'),
    ]

    plan = models.ForeignKey(ContinuityPlan, on_delete=models.CASCADE, related_name='exercises')
    scenario = models.ForeignKey(Scenario, on_delete=models.SET_NULL, null=True, blank=True, related_name='exercises')
    exercise_date = models.DateField()
    actual_recovery_hours = models.DecimalField(max_digits=6, decimal_places=2)
    outcome = models.CharField(max_length=20, choices=OUTCOME_CHOICES, default='SUCCESS')
    findings = models.TextField(blank=True, help_text="Aniqlangan kamchiliklar va takliflar")

    actual_recovery_seconds = models.PositiveBigIntegerField(default=0, editable=False)
    findings_closed = models.BooleanField(default=False)
    improvement_actions = models.TextField(blank=True, default='')
    is_synthetic = models.BooleanField(default=False)
    planned_recovery_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    resource_shortages = models.TextField(blank=True, default='')
    unfinished_tasks = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-exercise_date']

    def save(self, *args, **kwargs):
        synchronize_seconds(self, kwargs, [('actual_recovery_hours', 'actual_recovery_seconds', 3600)])
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.plan.title} Mashq ({self.exercise_date}): {self.get_outcome_display()}"
