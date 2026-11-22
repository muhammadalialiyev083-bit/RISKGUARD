from django.db.models import F
from django.utils import timezone

from apps.bia.models import BIAAssessment
from apps.plans.models import ContinuityPlan


def approved_assessments(process_ids):
    assessments = {}
    records = BIAAssessment.objects.active().filter(
        process_id__in=process_ids, status='APPROVED',
        organization_id=F('process__organization_id'),
    ).order_by('process_id', '-revision', '-pk')
    for assessment in records:
        assessments.setdefault(assessment.process_id, assessment)
    return assessments


def bia_basis(assessment):
    if assessment is None:
        return None
    return {
        'id': assessment.pk, 'revision': assessment.revision,
        'rto_hours': str(assessment.rto_hours), 'mtpd_hours': str(assessment.mtpd_hours),
        'rpo_minutes': assessment.rpo_minutes,
    }


def step_issues(plan, steps):
    if not steps:
        return ['Tiklanish qadamlari kiritilmagan.']
    unassigned = [
        str(step.sequence) for step in steps
        if not step.assigned_to_id or not step.assigned_to.is_active
        or step.assigned_to.organization_id != plan.organization_id
    ]
    return ['Mas’ul belgilanmagan qadamlar: ' + ', '.join(unassigned)] if unassigned else []


def plan_readiness(plan, assessment):
    published = plan.status == 'PUBLISHED'
    basis = (plan.snapshot or {}).get('bia')
    missing = step_issues(plan, list(plan.steps.all()))
    if assessment is None:
        missing.append('Tasdiqlangan BIA mavjud emas.')
    if published and not basis:
        missing.append('E’lon qilingan versiyada BIA dalili saqlanmagan.')
    elif published and assessment and basis != bia_basis(assessment):
        missing.append('Tasdiqlangan BIA yangilangan. Rejani qayta ko‘rib chiqing.')

    review = published and bool(missing)
    verified = next((
        exercise.pk for exercise in plan.exercises.all()
        if published and not review and plan.approved_at is not None
        and exercise.organization_id == plan.organization_id
        and not exercise.is_deleted and not exercise.is_synthetic and exercise.outcome == 'SUCCESS'
        and timezone.localtime(plan.approved_at).date() <= exercise.exercise_date <= timezone.localdate()
        and exercise.actual_recovery_hours <= assessment.rto_hours
    ), None)
    return {
        'published': published, 'needs_review': review, 'exercise_verified': verified is not None,
        'verified_exercise_id': verified, 'bia_basis': basis, 'missing_evidence': missing,
    }


def published_plan_readiness(process_ids, assessments):
    plans = ContinuityPlan.objects.active().filter(
        process_id__in=process_ids, status='PUBLISHED',
        organization_id=F('process__organization_id'),
    ).prefetch_related('steps__assigned_to', 'exercises').order_by(
        F('approved_at').desc(nulls_last=True), '-id',
    )
    by_process = {}
    for plan in plans:
        readiness = plan_readiness(plan, assessments.get(plan.process_id))
        by_process.setdefault(plan.process_id, []).append((plan, readiness))
    return by_process


def current_plan(entries):
    return next((entry for entry in entries if not entry[1]['needs_review']), entries[0] if entries else (None, None))


def readiness_label(readiness):
    if readiness['needs_review']:
        return 'Qayta ko‘rib chiqish kerak'
    if readiness['exercise_verified']:
        return 'Mashqda tekshirilgan'
    if readiness['published']:
        return 'E’lon qilingan'
    return 'E’lon qilinmagan'
