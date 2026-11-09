from django.db import models
from django.conf import settings


class Organization(models.Model):
    """
    FR-02: Tashkilot profili.
    Har bir tashkilot o'zining sohaviy parametrlari, vaqt mintaqasi va risk chegaralariga ega.
    """
    name = models.CharField(max_length=255, unique=True)
    sector = models.CharField(max_length=100, help_text="Tashkilot faoliyat sektori (masalan: Oliy ta'lim, Bank, Energetika)")
    timezone = models.CharField(max_length=50, default='Asia/Tashkent')
    
    # BIA va Risk konfiguratsiyasi (Hujjat 7.2 va 10.1)
    max_acceptable_loss = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=500000000.00,
        help_text="BIA moliyaviy zararni normallashtirish uchun maksimal ruxsat etilgan zarar (UZS)"
    )
    risk_low_threshold = models.PositiveSmallIntegerField(default=6, help_text="Past xavf maksimal chegarasi")
    risk_medium_threshold = models.PositiveSmallIntegerField(default=14, help_text="O'rta xavf maksimal chegarasi")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Department(models.Model):
    """
    Tashkilot bo'limi yoki filiali.
    """
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=200)
    head_name = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('organization', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.organization.name} - {self.name}"


class Service(models.Model):
    """
    Tashkilot ko'rsatadigan xizmat (masalan: Elektron ta'lim xizmati, Talabalar hisoboti).
    """
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='services')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_services'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('organization', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.organization.name} - {self.name}"
