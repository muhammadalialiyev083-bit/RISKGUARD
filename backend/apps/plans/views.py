import io
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from apps.plans.models import Strategy, ContinuityPlan, PlanStep
from apps.plans.serializers import StrategySerializer, ContinuityPlanSerializer, PlanStepSerializer
from apps.authentication.permissions import IsTenantMember, IsAuditorReadOnly, IsApproverRole
from apps.core.audit import record_audit


class StrategyViewSet(viewsets.ModelViewSet):
    """
    FR-08: Tiklash strategiyalari CRUD.
    """
    serializer_class = StrategySerializer
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Strategy.objects.all()
        return Strategy.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        strat = serializer.save(organization=self.request.user.organization)
        record_audit(
            request=self.request,
            action='CREATE',
            entity='Strategy',
            entity_id=strat.id,
            after_state={'name': strat.name, 'rto': str(strat.estimated_rto_hours)}
        )


class ContinuityPlanViewSet(viewsets.ModelViewSet):
    """
    FR-09: BCP/DRP rejalari, tasdiqlash, e'lon qilish va PDF eksport.
    """
    serializer_class = ContinuityPlanSerializer
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return ContinuityPlan.objects.all().prefetch_related('steps')
        return ContinuityPlan.objects.filter(organization=user.organization).prefetch_related('steps')

    def perform_create(self, serializer):
        plan = serializer.save(organization=self.request.user.organization)
        record_audit(
            request=self.request,
            action='CREATE',
            entity='ContinuityPlan',
            entity_id=plan.id,
            after_state={'title': plan.title, 'version': plan.version}
        )

    def perform_update(self, serializer):
        before = {'title': serializer.instance.title, 'version': serializer.instance.version, 'status': serializer.instance.status}
        plan = serializer.save()
        record_audit(
            request=self.request,
            action='UPDATE',
            entity='ContinuityPlan',
            entity_id=plan.id,
            before_state=before,
            after_state={'title': plan.title, 'version': plan.version, 'status': plan.status}
        )

    @action(detail=True, methods=['post'], permission_classes=[IsTenantMember, IsApproverRole])
    def publish(self, request, pk=None):
        """
        FR-09 va T-07: Rejani tasdiqlab, rasmiy versiyada e'lon qilish.
        Holat mashinasi (F1): DRAFT/IN_REVIEW/APPROVED -> PUBLISHED.
        Qayta publish (PUBLISHED) va ARCHIVED dan publish taqiqlangan.
        """
        plan = self.get_object()
        if plan.status not in ('DRAFT', 'IN_REVIEW', 'APPROVED'):
            return Response({
                'error': f"Reja {plan.status} holatidan e'lon qilinmaydi. Faqat DRAFT/IN_REVIEW/APPROVED -> PUBLISHED."
            }, status=status.HTTP_400_BAD_REQUEST)
        before_status = plan.status
        plan.status = 'PUBLISHED'
        plan.approved_by = request.user
        plan.approved_at = timezone.now()
        plan.save()

        record_audit(
            request=request,
            action='APPROVE',
            entity='ContinuityPlan',
            entity_id=plan.id,
            before_state={'status': before_status},
            after_state={'status': 'PUBLISHED', 'approved_by': request.user.username}
        )

        return Response({
            'message': 'Reja rasmiy e\'lon qilindi.',
            'plan': ContinuityPlanSerializer(plan).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def export_pdf(self, request, pk=None):
        """
        FR-09 va T-10: BCP/DRP rejasini PDF shaklida eksport qilish (NFR-07).
        """
        plan = self.get_object()
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        
        # PDF chizish
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, 750, f"BCMS Designer: Biznes Uzluksizlik Rejasi (BCP)")
        
        p.setFont("Helvetica", 12)
        p.drawString(50, 720, f"Reja nomi: {plan.title}")
        p.drawString(50, 700, f"Jarayon: {plan.process.name}")
        p.drawString(50, 680, f"Versiya: {plan.version} | Holati: {plan.get_status_display()}")
        p.drawString(50, 660, f"Tashkilot: {plan.organization.name}")
        p.drawString(50, 640, f"Tasdiqlovchi: {plan.approved_by.username if plan.approved_by else 'Tasdiqlanmagan'}")
        
        p.setFont("Helvetica-Bold", 13)
        p.drawString(50, 600, "Tiklash Qadamlari va Bosqichlari:")

        p.setFont("Helvetica", 10)
        y = 575
        steps = plan.steps.all().order_by('sequence')
        if steps.exists():
            for step in steps:
                assigned = step.assigned_to.username if step.assigned_to else "Belgilanmagan"
                line = f"{step.sequence}. {step.title} (Mas'ul: {assigned}, Muddat: {step.expected_duration_minutes} min)"
                p.drawString(60, y, line)
                y -= 20
        else:
            p.drawString(60, y, "Rejaga qadamlar kiritilmagan.")
            y -= 20

        p.showPage()
        p.save()

        buffer.seek(0)
        record_audit(
            request=request,
            action='EXPORT',
            entity='ContinuityPlan',
            entity_id=plan.id,
            after_state={'export_type': 'PDF'}
        )

        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="BCP_Plan_{plan.id}_v{plan.version}.pdf"'
        return response
