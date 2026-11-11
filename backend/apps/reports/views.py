from rest_framework import views, status, permissions
from rest_framework.response import Response
from apps.processes.models import BusinessProcess, Asset
from apps.bia.models import BIAAssessment
from apps.risks.models import Risk
from apps.plans.models import ContinuityPlan
from apps.simulation.models import Exercise
from apps.authentication.permissions import IsTenantMember
from apps.core.audit import record_audit
from django.http import HttpResponse
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError
from rest_framework.renderers import JSONRenderer, BaseRenderer
from collections import Counter
import csv
import io


SUMMARY_LABELS = {
    'total_processes': 'Jami jarayonlar',
    'critical_processes': 'Kritik jarayonlar',
    'total_assets': 'Tashkilotdagi jami aktivlar',
    'total_risks': 'Jami risklar',
    'high_risks_count': 'Yuqori risklar',
    'unplanned_processes_count': 'E’lon qilingan rejasi yo‘q jarayonlar',
    'rpo_gap_count': 'RPO tafovutlari',
    'approved_bias_count': 'Tasdiqlangan BIA baholashlari',
    'published_plans_count': 'E’lon qilingan rejaga ega jarayonlar',
    'completed_exercises_count': 'Qayd etilgan mashqlar',
}


def report_pdf(organization, summary, processes, start, end):
    from pathlib import Path
    from xml.sax.saxutils import escape
    import reportlab
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    if 'UzHiUnicode' not in pdfmetrics.getRegisteredFontNames():
        font_path = Path(reportlab.__file__).parent / 'fonts' / 'Vera.ttf'
        pdfmetrics.registerFont(TTFont('UzHiUnicode', str(font_path)))
    styles = getSampleStyleSheet()
    for name in ('Title', 'Heading2', 'Normal'):
        styles[name].fontName = 'UzHiUnicode'
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, title='Uzluksiz Himoya — tashkilot hisoboti',
                            pageCompression=0)
    paragraph = lambda value: Paragraph(escape(str(value)), styles['Normal'])
    story = [Paragraph('Uzluksiz Himoya', styles['Title']),
             Paragraph('Tashkilot bo‘yicha tayyorgarlik hisoboti', styles['Heading2']),
             paragraph(organization.name if organization else 'Tashkilot biriktirilmagan'),
             paragraph(f'Jarayonlar yaratilgan davr: {start or "boshlanishdan"} — {end or "hozirgacha"}'),
             paragraph('Aktivlar ko‘rsatkichi butun tashkilotni qamrab oladi; boshqa ko‘rsatkichlar tanlangan jarayonlar guruhiga tegishli.'),
             Spacer(1, 16)]
    table = Table([[paragraph('Ko‘rsatkich'), paragraph('Qiymat')]] +
                  [[paragraph(SUMMARY_LABELS.get(key, key)), paragraph(value)] for key, value in summary.items()],
                  colWidths=[365, 85], repeatRows=1)
    table.setStyle(TableStyle([('FONTNAME', (0, 0), (-1, -1), 'UzHiUnicode'),
                               ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2f4f1')),
                               ('GRID', (0, 0), (-1, -1), .3, colors.HexColor('#b9c8d2')),
                               ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                               ('TOPPADDING', (0, 0), (-1, -1), 7),
                               ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
    story.extend([table, Spacer(1, 20), Paragraph('Jarayonlar reestri', styles['Heading2'])])
    rows = [[paragraph('Jarayon'), paragraph('Kritiklik'), paragraph('Holat')]]
    rows += [[paragraph(p.name), paragraph(p.get_criticality_display()), paragraph(p.get_status_display())] for p in processes]
    if len(rows) == 1:
        story.append(paragraph('Tanlangan filtrlar bo‘yicha jarayonlar mavjud emas.'))
    else:
        records = Table(rows, colWidths=[250, 105, 95], repeatRows=1)
        records.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2f4f1')),
                                    ('GRID', (0, 0), (-1, -1), .3, colors.HexColor('#b9c8d2'))]))
        story.append(records)
    doc.build(story)
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="uzhi-report.pdf"'
    return response


class CSVRenderer(BaseRenderer):
    media_type = 'text/csv'
    format = 'csv'
    def render(self, data, accepted_media_type=None, renderer_context=None):
        return str(data).encode('utf-8')


class OrganizationDashboardReportView(views.APIView):
    """
    FR-11: Dashboard konsolidatsiyasi (/api/v1/reports/organization).
    Kritik jarayonlar, yuqori xavflar, rejasi yo'q jarayonlar va RPO gap statistikasi.
    """
    permission_classes = [IsTenantMember]
    renderer_classes = [JSONRenderer, CSVRenderer]

    def get(self, request):
        org = request.user.organization
        if not org and request.user.is_superuser:
            # Superuser uchun birinchi tashkilot yoki umumiy
            org = request.user.organization

        processes = BusinessProcess.objects.filter(organization=org)
        start = request.query_params.get('from')
        end = request.query_params.get('to')
        for name, value in [('from', start), ('to', end)]:
            if value:
                try:
                    valid_date = parse_date(value)
                except ValueError:
                    valid_date = None
                if not valid_date:
                    raise ValidationError({name: 'YYYY-MM-DD sanasini kiriting.'})
        if start and end and start > end:
            raise ValidationError({'to': 'Tugash sanasi boshlanishdan oldin bo‘lishi mumkin emas.'})
        service = request.query_params.get('service')
        if service:
            if not service.isdigit():
                raise ValidationError({'service': 'Xizmat ID sini kiriting.'})
            processes = processes.filter(service_id=service)
        if start:
            processes = processes.filter(created_at__date__gte=start)
        if end:
            processes = processes.filter(created_at__date__lte=end)
        process_ids = list(processes.values_list('pk', flat=True))
        total_processes = processes.count()
        critical_processes = processes.filter(criticality='CRITICAL').count()

        # Risklar
        risks = Risk.objects.filter(organization=org, process_id__in=process_ids)
        total_risks = risks.count()
        high_risk_threshold = org.risk_medium_threshold + 1 if org else 15
        high_risks = sum(1 for r in risks if r.risk_score >= high_risk_threshold)

        # Rejasi yo'q jarayonlar
        processes_with_plans = ContinuityPlan.objects.filter(
            organization=org,
            process_id__in=process_ids,
            status='PUBLISHED'
        ).values_list('process_id', flat=True).distinct()
        unplanned_processes = total_processes - len(processes_with_plans)

        # BIA va RPO gap statistikasi
        bias = BIAAssessment.objects.filter(organization=org, process_id__in=process_ids)
        rpo_gap_count = sum(1 for b in bias if b.has_rpo_gap)
        approved_bias_count = bias.filter(status='APPROVED').count()

        # Mashqlar
        exercises_count = Exercise.objects.filter(organization=org, plan__process_id__in=process_ids).count()

        summary = {
            'total_processes': total_processes,
            'critical_processes': critical_processes,
            'total_assets': Asset.objects.filter(organization=org).count(),
            'total_risks': total_risks,
            'high_risks_count': high_risks,
            'unplanned_processes_count': max(0, unplanned_processes),
            'rpo_gap_count': rpo_gap_count,
            'approved_bias_count': approved_bias_count,
            'published_plans_count': len(processes_with_plans),
            'completed_exercises_count': exercises_count,
        }
        if request.query_params.get('export') == 'pdf':
            response = report_pdf(org, summary, processes, start, end)
            record_audit(request=request, action='EXPORT', entity='OrganizationReport',
                         entity_id=org.id if org else '', after_state={'export_type': 'PDF', 'from': start, 'to': end})
            return response
        if request.accepted_renderer.format == 'csv' or request.query_params.get('export') == 'csv':
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = 'attachment; filename="uzhi-report.csv"'
            response.write('\ufeff')
            writer = csv.writer(response)
            writer.writerow(['Ko‘rsatkich', 'Qiymat'])
            for key, value in summary.items():
                writer.writerow([SUMMARY_LABELS.get(key, key), value])
            writer.writerow([])
            writer.writerow(['Jarayon', 'Kritiklik', 'Holat'])
            for process in processes:
                # Prevent spreadsheet formula execution in user-controlled strings.
                safe_name = "'" + process.name if process.name.startswith(('=', '+', '-', '@')) else process.name
                writer.writerow([safe_name, process.criticality, process.status])
            record_audit(request=request, action='EXPORT', entity='OrganizationReport',
                         entity_id=org.id if org else '', after_state={'export_type': 'CSV', 'from': start, 'to': end})
            return response
        return Response({
            'organization': org.name if org else 'SuperAdmin View',
            'filters': {'from': start, 'to': end, 'service': service},
            'process_ids': process_ids,
            'risk_distribution': dict(Counter(r.get_risk_class(
                low_thresh=org.risk_low_threshold if org else 6,
                med_thresh=org.risk_medium_threshold if org else 14) for r in risks)),
            'criticality_distribution': dict(Counter(processes.values_list('criticality', flat=True))),
            'unplanned_process_ids': list(processes.exclude(pk__in=processes_with_plans).values_list('pk', flat=True)),
            'rpo_gap_bia_ids': [b.pk for b in bias if b.has_rpo_gap],
            'high_risk_ids': [r.pk for r in risks if r.risk_score >= high_risk_threshold],
            'summary': summary,
        }, status=status.HTTP_200_OK)
