"""Tenant-owned operational resilience records. No changes to historical data."""
from django.conf import settings
from django.db import models
from django.core.exceptions import PermissionDenied
from apps.core.models import BaseTenantModel

RISK_LEVELS = [('LOW', 'Past'), ('MEDIUM', 'O‘rta'), ('HIGH', 'Yuqori'), ('CRITICAL', 'Kritik')]


class Provider(BaseTenantModel):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    contact_email = models.EmailField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    services = models.ManyToManyField('organizations.Service', blank=True, related_name='providers')
    assets = models.ManyToManyField('processes.Asset', blank=True, related_name='providers')
    risk_rating = models.CharField(max_length=10, choices=RISK_LEVELS, default='MEDIUM')
    next_review_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['name']
        constraints = [models.UniqueConstraint(fields=['organization', 'name'], condition=models.Q(is_deleted=False), name='unique_tenant_provider')]


class Incident(BaseTenantModel):
    STATUS_CHOICES = [(v, l) for v, l in [('OPEN', 'Ochiq'), ('INVESTIGATING', 'Tekshirilmoqda'), ('RECOVERING', 'Tiklanmoqda'), ('RESOLVED', 'Bartarf etilgan'), ('CLOSED', 'Yopilgan')]]
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    severity = models.CharField(max_length=10, choices=RISK_LEVELS, default='MEDIUM')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    provider = models.ForeignKey(Provider, null=True, blank=True, on_delete=models.SET_NULL, related_name='incidents')
    asset = models.ForeignKey('processes.Asset', null=True, blank=True, on_delete=models.SET_NULL, related_name='incidents')
    plan = models.ForeignKey('plans.ContinuityPlan', null=True, blank=True, on_delete=models.SET_NULL, related_name='incidents')
    scenario = models.ForeignKey('simulation.Scenario', null=True, blank=True, on_delete=models.SET_NULL, related_name='incidents')
    conclusion = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']


class SimulationRun(BaseTenantModel):
    scenario = models.ForeignKey('simulation.Scenario', on_delete=models.PROTECT, related_name='saved_runs')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    result = models.JSONField(default=dict)

    class Meta:
        ordering = ['-created_at']


class ImprovementTask(BaseTenantModel):
    STATUS_CHOICES = [('OPEN', 'Ochiq'), ('IN_PROGRESS', 'Bajarilmoqda'), ('DONE', 'Bajarilgan')]
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    due_date = models.DateField(null=True, blank=True)
    incident = models.ForeignKey(Incident, null=True, blank=True, on_delete=models.PROTECT, related_name='tasks')
    scenario = models.ForeignKey('simulation.Scenario', null=True, blank=True, on_delete=models.PROTECT, related_name='improvements')
    simulation_run = models.ForeignKey(SimulationRun, null=True, blank=True, on_delete=models.PROTECT, related_name='improvements')
    process = models.ForeignKey('processes.BusinessProcess', null=True, blank=True, on_delete=models.SET_NULL, related_name='improvements')

    class Meta:
        ordering = ['status', 'due_date', '-created_at']


class IncidentEvent(models.Model):
    incident = models.ForeignKey(Incident, on_delete=models.PROTECT, related_name='timeline')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    event = models.CharField(max_length=30)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionDenied('Hodisa tarixini tahrirlash mumkin emas.')
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionDenied('Hodisa tarixini o‘chirish mumkin emas.')
