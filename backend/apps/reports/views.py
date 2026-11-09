from rest_framework import views, status, permissions
from rest_framework.response import Response
from apps.processes.models import BusinessProcess, Asset
from apps.bia.models import BIAAssessment
from apps.risks.models import Risk
from apps.plans.models import ContinuityPlan
from apps.simulation.models import Exercise
from apps.authentication.permissions import IsTenantMember


class OrganizationDashboardReportView(views.APIView):
    """
    FR-11: Dashboard konsolidatsiyasi (/api/v1/reports/organization).
    Kritik jarayonlar, yuqori xavflar, rejasi yo'q jarayonlar va RPO gap statistikasi.
    """
    permission_classes = [IsTenantMember]

    def get(self, request):
        org = request.user.organization
        if not org and request.user.is_superuser:
            # Superuser uchun birinchi tashkilot yoki umumiy
            org = request.user.organization

        processes = BusinessProcess.objects.filter(organization=org)
        total_processes = processes.count()
        critical_processes = processes.filter(criticality='CRITICAL').count()

        # Risklar
        risks = Risk.objects.filter(organization=org)
        total_risks = risks.count()
        high_risk_threshold = org.risk_medium_threshold + 1 if org else 15
        high_risks = sum(1 for r in risks if r.risk_score >= high_risk_threshold)

        # Rejasi yo'q jarayonlar
        processes_with_plans = ContinuityPlan.objects.filter(
            organization=org,
            status='PUBLISHED'
        ).values_list('process_id', flat=True).distinct()
        unplanned_processes = total_processes - len(processes_with_plans)

        # BIA va RPO gap statistikasi
        bias = BIAAssessment.objects.filter(organization=org)
        rpo_gap_count = sum(1 for b in bias if b.has_rpo_gap)
        approved_bias_count = bias.filter(status='APPROVED').count()

        # Mashqlar
        exercises_count = Exercise.objects.filter(organization=org).count()

        return Response({
            'organization': org.name if org else 'SuperAdmin View',
            'summary': {
                'total_processes': total_processes,
                'critical_processes': critical_processes,
                'total_assets': Asset.objects.filter(organization=org).count(),
                'total_risks': total_risks,
                'high_risks_count': high_risks,
                'unplanned_processes_count': max(0, unplanned_processes),
                'rpo_gap_count': rpo_gap_count,
                'approved_bias_count': approved_bias_count,
                'published_plans_count': len(processes_with_plans),
                'completed_exercises_count': exercises_count
            }
        }, status=status.HTTP_200_OK)
