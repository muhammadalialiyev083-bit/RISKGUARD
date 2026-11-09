from rest_framework import viewsets, permissions, status
from apps.risks.models import Risk, Control
from apps.risks.serializers import RiskSerializer, ControlSerializer
from apps.authentication.permissions import IsTenantMember, IsAuditorReadOnly, IsRiskAnalystOrManager
from apps.core.audit import record_audit


class RiskViewSet(viewsets.ModelViewSet):
    """
    FR-06: Risk reestri (Likelihood, Impact, Residual risk).
    """
    serializer_class = RiskSerializer
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Risk.objects.all().prefetch_related('controls')
        return Risk.objects.filter(organization=user.organization).prefetch_related('controls')

    def perform_create(self, serializer):
        risk = serializer.save(organization=self.request.user.organization)
        record_audit(
            request=self.request,
            action='CREATE',
            entity='Risk',
            entity_id=risk.id,
            after_state={'threat': risk.threat, 'score': risk.risk_score}
        )

    def perform_update(self, serializer):
        before = {'score': serializer.instance.risk_score, 'residual': serializer.instance.residual_risk_score}
        risk = serializer.save()
        record_audit(
            request=self.request,
            action='UPDATE',
            entity='Risk',
            entity_id=risk.id,
            before_state=before,
            after_state={'score': risk.risk_score, 'residual': risk.residual_risk_score}
        )


class ControlViewSet(viewsets.ModelViewSet):
    """
    FR-06: Xavf nazorat choralari (Controls).
    """
    serializer_class = ControlSerializer
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Control.objects.all()
        return Control.objects.filter(risk__organization=user.organization)

    def perform_create(self, serializer):
        control = serializer.save()
        record_audit(
            request=self.request,
            action='CREATE',
            entity='Control',
            entity_id=control.id,
            after_state={'title': control.title, 'risk_id': control.risk_id}
        )
