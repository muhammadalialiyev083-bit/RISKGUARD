import hashlib
import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.core.audit import record_audit
from apps.operations.models import ImprovementTask
from apps.plans.models import ContinuityPlan
from apps.plans.readiness import bia_basis


def review_plans_for_bia(request, assessment):
    process = assessment.process
    basis = bia_basis(assessment)
    plans = ContinuityPlan.objects.active().filter(
        process=process, organization=assessment.organization, status='PUBLISHED',
    )
    owner = process.owner
    if not owner or not owner.is_active or owner.organization_id != assessment.organization_id:
        owner = get_user_model().objects.filter(
            organization=assessment.organization, is_active=True, role__in=['BCMS_MANAGER', 'ADMIN'],
        ).order_by('pk').first()
        if owner is None and request.user.organization_id == assessment.organization_id:
            owner = request.user
    fingerprint = hashlib.sha256(json.dumps(basis, sort_keys=True).encode()).hexdigest()
    for plan in plans:
        if (plan.snapshot or {}).get('bia') == basis:
            continue
        task, created = ImprovementTask.objects.get_or_create(
            organization=assessment.organization, source_key=f'bia:{plan.pk}:{fingerprint}',
            defaults={
                'title': f'BCP v{plan.version} · BIA v{assessment.revision} bo‘yicha ko‘rib chiqing',
                'description': plan.title,
                'process': process, 'plan': plan, 'owner': owner,
                'due_date': plan.review_due_date or timezone.localdate() + timedelta(days=14),
            },
        )
        if created:
            record_audit(request=request, action='CREATE', entity='ImprovementTask', entity_id=task.pk,
                         after_state={'plan_id': plan.pk, 'bia_id': assessment.pk, 'owner_id': owner.pk if owner else None})
