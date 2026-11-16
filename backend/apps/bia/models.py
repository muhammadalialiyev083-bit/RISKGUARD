from django.db import models
from apps.core.duration_fields import synchronize_seconds
from django.conf import settings
from django.core.exceptions import ValidationError
from apps.core.models import BaseTenantModel
from apps.processes.models import BusinessProcess


class BIAAssessment(BaseTenantModel):
    """
    FR-05: BIA so'rovnomasi va baholash kartochkasi.
    MTPD, RTO, RPO va zaxiralash oraliqlarini saqlaydi.
    Validatsiya: RTO <= MTPD.
    """
    STATUS_CHOICES = [
        ('DRAFT', 'Qoralama'),
        ('SUBMITTED', 'Ko\'rib chiqishga yuborilgan'),
        ('APPROVED', 'Tasdiqlangan'),
        ('REJECTED', 'Rad etilgan'),
    ]

    process = models.ForeignKey(BusinessProcess, on_delete=models.CASCADE, related_name='bia_assessments')
    revision = models.PositiveIntegerField(default=1)
    mtpd_hours = models.DecimalField(max_digits=6, decimal_places=2, help_text="Maksimal ruxsat etilgan uzilish vaqti (soat)")
    rto_hours = models.DecimalField(max_digits=6, decimal_places=2, help_text="Rejalashtirilgan tiklash maqsadi (soat)")
    rpo_minutes = models.PositiveIntegerField(default=60, help_text="Ruxsat etilgan ma'lumot yo'qotish vaqti (daqiqa)")
    backup_interval_minutes = models.PositiveIntegerField(default=60, help_text="Joriy zaxiralash (backup) oralig'i (daqiqa)")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_bias'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    comments = models.TextField(blank=True)

    data_source = models.TextField(blank=True, default='')
    rationale = models.TextField(blank=True, default='')
    impact_weights = models.JSONField(default=dict, blank=True)
    recommended_values = models.JSONField(default=dict, blank=True)
    mtpd_seconds = models.PositiveBigIntegerField(default=0, editable=False)
    rto_seconds = models.PositiveBigIntegerField(default=0, editable=False)
    rpo_seconds = models.PositiveBigIntegerField(default=0, editable=False)
    backup_interval_seconds = models.PositiveBigIntegerField(default=0, editable=False)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(rto_hours__gt=0, mtpd_hours__gte=models.F('rto_hours')), name='bia_rto_before_mtpd'),
            models.UniqueConstraint(fields=['process', 'revision'], name='bia_unique_process_revision'),
        ]
        ordering = ['-revision', '-created_at']

    def clean(self):
        super().clean()
        if self.rto_hours is not None and self.mtpd_hours is not None:
            if self.rto_hours > self.mtpd_hours:
                raise ValidationError({
                    'rto_hours': f"RTO ({self.rto_hours} soat) MTPD dan ({self.mtpd_hours} soat) katta bo'lishi mumkin emas. (RTO <= MTPD talabi buzildi)."
                })

    def save(self, *args, **kwargs):
        synchronize_seconds(self, kwargs, [('mtpd_hours', 'mtpd_seconds', 3600),
                                          ('rto_hours', 'rto_seconds', 3600),
                                          ('rpo_minutes', 'rpo_seconds', 60),
                                          ('backup_interval_minutes', 'backup_interval_seconds', 60)])
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def has_rpo_gap(self):
        """Zaxiralash oralig'i RPO dan katta bo'lsa ogohlantirish (T-05)."""
        return self.backup_interval_minutes > self.rpo_minutes

    def __str__(self):
        return f"BIA: {self.process.name} (Rev {self.revision}) - RTO: {self.rto_hours}h, MTPD: {self.mtpd_hours}h"


class BIAImpact(models.Model):
    """
    FR-05: Vaqt gorizontlari bo'yicha zarar baholari (t=0, 1, 2, 4, 8, 24, 48 soat).
    """
    bia = models.ForeignKey(BIAAssessment, on_delete=models.CASCADE, related_name='impacts')
    horizon_hours = models.DecimalField(max_digits=6, decimal_places=2)
    financial_loss = models.DecimalField(max_digits=18, decimal_places=2, default=0.00)
    operational_score = models.PositiveSmallIntegerField(default=1, help_text="Operatsion ta'sir (1-5)")
    legal_score = models.PositiveSmallIntegerField(default=1, help_text="Huquqiy ta'sir (1-5)")
    reputational_score = models.PositiveSmallIntegerField(default=1, help_text="Obro'ga ta'sir (1-5)")

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(financial_loss__gte=0, horizon_hours__gte=0,
                      operational_score__gte=1, operational_score__lte=5, legal_score__gte=1,
                      legal_score__lte=5, reputational_score__gte=1, reputational_score__lte=5), name='bia_valid_impact')]
        ordering = ['horizon_hours']
        unique_together = ('bia', 'horizon_hours')

    def clean(self):
        for score_field in ['operational_score', 'legal_score', 'reputational_score']:
            val = getattr(self, score_field)
            if val < 1 or val > 5:
                raise ValidationError({score_field: "Ball 1 dan 5 gacha bo'lishi shart."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.bia.process.name} @ {self.horizon_hours}h - Fin: {self.financial_loss} UZS"
