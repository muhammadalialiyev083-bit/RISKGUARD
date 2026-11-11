from apps.core.viewsets import AuditedModelViewSet
import io
from django.http import HttpResponse
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from apps.plans.models import Strategy, ContinuityPlan, PlanStep
from apps.plans.serializers import StrategySerializer, ContinuityPlanSerializer, PlanStepSerializer
from apps.authentication.permissions import IsTenantMember, IsAuditorReadOnly, IsApproverRole
from apps.core.audit import record_audit


class StrategyViewSet(AuditedModelViewSet):
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


class ContinuityPlanViewSet(AuditedModelViewSet):
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

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        plan = self.get_object()
        if plan.status != 'DRAFT':
            return Response({'detail': 'Faqat qoralama reja yuboriladi.'}, status=400)
        plan.status = 'IN_REVIEW'
        plan.save()
        record_audit(request=request, action='UPDATE', entity='ContinuityPlan',
                     entity_id=plan.id, after_state={'status': plan.status})
        return Response(self.get_serializer(plan).data)

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
        from pathlib import Path
        from xml.sax.saxutils import escape
        import reportlab
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet

        font_path = Path(reportlab.__file__).parent / 'fonts' / 'Vera.ttf'
        if 'UzHiUnicode' not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont('UzHiUnicode', str(font_path)))
        styles = getSampleStyleSheet()
        for name in ('Title', 'Heading2', 'Normal'):
            styles[name].fontName = 'UzHiUnicode'
        buffer = io.BytesIO()
        document = SimpleDocTemplate(buffer, pagesize=letter, title=plan.title)
        story = [Paragraph('Uzluksiz Himoya — BCP / DRP', styles['Title'])]
        def paragraph(text, style='Normal'):
            story.append(Paragraph(escape(str(text)), styles[style]))
            story.append(Spacer(1, 10))
        paragraph(plan.title, 'Heading2')
        paragraph(f'Jarayon: {plan.process.name}')
        paragraph(f'Versiya: {plan.version} | Holat: {plan.get_status_display()}')
        paragraph(f'Tashkilot: {plan.organization.name}')
        paragraph(f"Tasdiqlovchi: {plan.approved_by.username if plan.approved_by else 'Tasdiqlanmagan'}")
        paragraph(plan.scope)
        paragraph('Tiklash qadamlari', 'Heading2')
        for step in plan.steps.all().order_by('sequence'):
            assigned = step.assigned_to.username if step.assigned_to else 'Belgilanmagan'
            paragraph(f"{step.sequence}. {step.title} — {assigned}; {step.expected_duration_minutes} daqiqa")
            if step.description:
                paragraph(step.description)
        document.build(story)
        buffer.seek(0)
        record_audit(
            request=request,
            action='EXPORT',
            entity='ContinuityPlan',
            entity_id=plan.id,
            after_state={'export_type': 'PDF'}
        )

        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="BCP_Plan_{plan.id}_v{slugify(plan.version)}.pdf"'
        return response
