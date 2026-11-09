from django.db import models
from django.conf import settings
from apps.core.models import BaseTenantModel
from apps.organizations.models import Service


class BusinessProcess(BaseTenantModel):
    """
    FR-03: Jarayonlar reestri.
    Biznes jarayon nomi, egasi, xizmati, kritikligi va holati.
    """
    CRITICALITY_CHOICES = [
        ('CRITICAL', 'Kritik (Juda yuqori)'),
        ('HIGH', 'Yuqori'),
        ('MEDIUM', 'O\'rta'),
        ('LOW', 'Past'),
    ]

    STATUS_CHOICES = [
        ('ACTIVE', 'Faol'),
        ('UNDER_REVIEW', 'Ko\'rib chiqilmoqda'),
        ('INACTIVE', 'Nofaol'),
    ]

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='processes')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_processes'
    )
    criticality = models.CharField(max_length=20, choices=CRITICALITY_CHOICES, default='HIGH')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')

    class Meta:
        ordering = ['name']
        unique_together = ('organization', 'name')

    def __str__(self):
        return f"{self.name} ({self.get_criticality_display()})"


class Asset(BaseTenantModel):
    """
    FR-04: Aktivlar va resurslar.
    Server, Tizim, Xodim, Provayder yoki Infratuzilma.
    """
    TYPE_CHOICES = [
        ('SYSTEM', 'Axborot tizimi / Dastur'),
        ('SERVER', 'Server / Ma\'lumotlar bazasi'),
        ('PERSONNEL', 'Xodim / Mas\'ul jamoa'),
        ('VENDOR', 'Uchinchi tomon / Provayder'),
        ('FACILITY', 'Infratuzilma / Bino'),
    ]

    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_assets'
    )

    class Meta:
        ordering = ['name']
        unique_together = ('organization', 'name')

    def __str__(self):
        return f"{self.name} [{self.get_type_display()}]"


class Dependency(BaseTenantModel):
    """
    FR-04: Aktivlar va jarayonlar o'rtasidagi qaramlik (Directed Graph E).
    Masalan: Jarayon -> Server, yoki Jarayon -> Boshqa Jarayon.
    """
    ENTITY_TYPE_CHOICES = [
        ('PROCESS', 'Biznes jarayoni'),
        ('ASSET', 'Aktiv / Resurs'),
    ]

    CRITICALITY_CHOICES = [
        ('MANDATORY', 'Majburiy (Uzilish to\'xtatadi)'),
        ('OPTIONAL', 'Ixtiyoriy / Zaxirali'),
    ]

    from_type = models.CharField(max_length=20, choices=ENTITY_TYPE_CHOICES)
    from_id = models.PositiveIntegerField()
    to_type = models.CharField(max_length=20, choices=ENTITY_TYPE_CHOICES)
    to_id = models.PositiveIntegerField()
    dependency_criticality = models.CharField(max_length=20, choices=CRITICALITY_CHOICES, default='MANDATORY')
    notes = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['organization', 'from_type', 'from_id']),
            models.Index(fields=['organization', 'to_type', 'to_id']),
        ]

    def __str__(self):
        return f"{self.from_type}:{self.from_id} -> {self.to_type}:{self.to_id}"
