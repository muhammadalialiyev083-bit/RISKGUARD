from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.bia.models import BIAAssessment, BIAImpact
from apps.bia.serializers import BIAAssessmentSerializer, BIAImpactSerializer
from apps.authentication.permissions import IsTenantMember, IsAuditorReadOnly, IsApproverRole
from apps.core.audit import record_audit


class BIAAssessmentViewSet(viewsets.ModelViewSet):
    """
    FR-05: BIA so'rovnomasi va baholash.
    RTO <= MTPD validatsiyasi va Tasdiqlash (/approve) amalini o'z ichiga oladi.
    """
    serializer_class = BIAAssessmentSerializer
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return BIAAssessment.objects.all().prefetch_related('impacts')
        return BIAAssessment.objects.filter(organization=user.organization).prefetch_related('impacts')

    def perform_create(self, serializer):
        bia = serializer.save(organization=self.request.user.organization)
        record_audit(
            request=self.request,
            action='CREATE',
            entity='BIAAssessment',
            entity_id=bia.id,
            after_state={'process': bia.process.name, 'rto': str(bia.rto_hours), 'mtpd': str(bia.mtpd_hours)}
        )

    def perform_update(self, serializer):
        before = {'status': serializer.instance.status, 'rto': str(serializer.instance.rto_hours)}
        bia = serializer.save()
        record_audit(
            request=self.request,
            action='UPDATE',
            entity='BIAAssessment',
            entity_id=bia.id,
            before_state=before,
            after_state={'status': bia.status, 'rto': str(bia.rto_hours)}
        )

    @action(detail=True, methods=['post'], permission_classes=[IsTenantMember, IsApproverRole])
    def approve(self, request, pk=None):
        """
        FR-05 va FR-12: Rahbariyat / Tasdiqlovchi tomonidan BIA tasdiqlash.
        Holat mashinasi (F1): faqat DRAFT/SUBMITTED -> APPROVED.
        REJECTED avval update orqali DRAFT ga qaytarilishi shart.
        """
        bia = self.get_object()
        if bia.status not in ('DRAFT', 'SUBMITTED'):
            return Response({
                'error': f"BIA {bia.status} holatidan tasdiqlanmaydi. Faqat DRAFT/SUBMITTED -> APPROVED."
            }, status=status.HTTP_400_BAD_REQUEST)
        bia.status = 'APPROVED'
        bia.approved_by = request.user
        bia.approved_at = timezone.now()
        bia.save()

        record_audit(
            request=request,
            action='APPROVE',
            entity='BIAAssessment',
            entity_id=bia.id,
            after_state={'status': 'APPROVED', 'approved_by': request.user.username}
        )

        return Response({
            'message': 'BIA baholashi muvaffaqiyatli tasdiqlandi.',
            'bia': BIAAssessmentSerializer(bia).data
        }, status=status.HTTP_200_OK)
