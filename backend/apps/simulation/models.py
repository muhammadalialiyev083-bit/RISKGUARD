from django.db import models
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

    class Meta:
        ordering = ['title']

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

    class Meta:
        ordering = ['-exercise_date']

    def __str__(self):
        return f"{self.plan.title} Mashq ({self.exercise_date}): {self.get_outcome_display()}"
