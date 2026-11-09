from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from apps.core.models import BaseTenantModel
from apps.processes.models import BusinessProcess, Asset


class Risk(BaseTenantModel):
    """
    FR-06: Risk reestri.
    Tahdid, aktiv, sabab, ehtimollik (1-5), ta'sir (1-5), nazorat choralari va qoldiq risk.
    """
    STATUS_CHOICES = [
        ('IDENTIFIED', 'Aniqlangan'),
        ('ASSESSED', 'Baholangan'),
        ('MITIGATED', 'Nazorat chorasi qo\'llangan'),
        ('ACCEPTED', 'Qabul qilingan'),
    ]

    process = models.ForeignKey(BusinessProcess, on_delete=models.CASCADE, related_name='risks')
    asset = models.ForeignKey(Asset, on_delete=models.SET_NULL, null=True, blank=True, related_name='risks')
    threat = models.CharField(max_length=255, help_text="Tahdid tavsifi (masalan: Server apparat nosozligi)")
    vulnerability = models.TextField(blank=True, help_text="Zaiflik / sabab")
    
    likelihood = models.PositiveSmallIntegerField(default=3, help_text="Ehtimollik (1-5)")
    impact = models.PositiveSmallIntegerField(default=3, help_text="Ta'sir (1-5)")
    
    likelihood_residual = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Qoldiq ehtimollik (1-5)")
    impact_residual = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Qoldiq ta'sir (1-5)")
    
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_risks'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IDENTIFIED')

    class Meta:
        ordering = ['-id']

    def clean(self):
        for score_field in ['likelihood', 'impact']:
            val = getattr(self, score_field)
            if val < 1 or val > 5:
                raise ValidationError({score_field: "Qiymat 1 dan 5 gacha bo'lishi shart."})
        for res_field in ['likelihood_residual', 'impact_residual']:
            val = getattr(self, res_field)
            if val is not None and (val < 1 or val > 5):
                raise ValidationError({res_field: "Qiymat 1 dan 5 gacha bo'lishi shart."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def risk_score(self):
        """Soddalashtirilgan risk indeksi: Likelihood * Impact (1..25)."""
        return self.likelihood * self.impact

    @property
    def residual_risk_score(self):
        """Qoldiq risk indeksi: Likelihood_residual * Impact_residual."""
        if self.likelihood_residual is not None and self.impact_residual is not None:
            return self.likelihood_residual * self.impact_residual
        return None

    @property
    def risk_reduction(self):
        """Risk kamayishi delta = R0 - Rafter."""
        res = self.residual_risk_score
        if res is not None:
            return self.risk_score - res
        return 0

    def get_risk_class(self, low_thresh=6, med_thresh=14):
        """Risk klassi: low, medium, high (Hujjat 10.1)."""
        score = self.risk_score
        if score <= low_thresh:
            return 'low'
        elif score <= med_thresh:
            return 'medium'
        return 'high'

    def __str__(self):
        return f"{self.threat} (Score: {self.risk_score}) - {self.process.name}"


class Control(models.Model):
    """
    FR-06: Xavfni kamaytirish choralari (Mitigation Controls).
    """
    STATUS_CHOICES = [
        ('PLANNED', 'Rejalashtirilgan'),
        ('IN_PROGRESS', 'Jarayonda'),
        ('IMPLEMENTED', 'Joriy etilgan'),
        ('EFFECTIVE', 'Samarali deb topilgan'),
    ]

    risk = models.ForeignKey(Risk, on_delete=models.CASCADE, related_name='controls')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNED')
    effectiveness_evidence = models.TextField(blank=True, help_text="Samaradorlik asosi yoki tekshiruv natijasi")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.title} [{self.get_status_display()}]"
