from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.permissions import IsTenantMember
from apps.operations.models import ImprovementTask
from apps.plans.models import Strategy
from apps.plans.readiness import approved_assessments, bia_basis, current_plan, published_plan_readiness
from apps.processes.models import BusinessProcess
from apps.risks.models import Risk
from apps.simulation.models import Exercise


def process_continuity(organization, service=None):
    processes = BusinessProcess.objects.active().filter(organization=organization).select_related('owner', 'service')
    if service is not None:
        processes = processes.filter(service=service)
    processes = list(processes)
    ids = [process.pk for process in processes]
    assessments = approved_assessments(ids)
    published = published_plan_readiness(ids, assessments)
    risks, exercises, strategies, tasks = {}, {}, {}, {}
    for risk in Risk.objects.active().filter(organization=organization, process_id__in=ids):
        risks.setdefault(risk.process_id, []).append({'id': risk.pk, 'label': risk.threat, 'score': risk.risk_score})
    for exercise in Exercise.objects.active().filter(
        organization=organization, plan__process_id__in=ids, is_synthetic=False,
    ).select_related('plan').order_by('-exercise_date', '-pk'):
        exercises.setdefault(exercise.plan.process_id, exercise)
    for strategy in Strategy.objects.active().filter(organization=organization, process_id__in=ids, is_selected=True):
        strategies.setdefault(strategy.process_id, strategy)
    for task in ImprovementTask.objects.active().filter(
        organization=organization, process_id__in=ids,
    ).exclude(status='DONE').select_related('owner'):
        tasks.setdefault(task.process_id, []).append({
            'id': task.pk, 'label': task.title, 'due_date': task.due_date,
            'plan_id': task.plan_id, 'exercise_id': task.exercise_id,
            'owner': task.owner.get_full_name() or task.owner.username if task.owner else None,
        })

    for process in processes:
        pk = process.pk
        assessment = assessments.get(pk)
        plan, readiness = current_plan(published.get(pk, []))
        exercise = exercises.get(pk)
        strategy = strategies.get(pk)
        yield {
            'id': pk, 'name': process.name, 'service_id': process.service_id,
            'owner': process.owner.get_full_name() or process.owner.username if process.owner else None,
            'bia': bia_basis(assessment), 'risks': risks.get(pk, []),
            'strategy': {'id': strategy.pk, 'label': strategy.name} if strategy else None,
            'plan': {'id': plan.pk, 'label': plan.title, 'version': plan.version,
                     'review_due_date': plan.review_due_date, 'readiness': readiness} if plan else None,
            'exercise': {'id': exercise.pk, 'date': exercise.exercise_date, 'outcome': exercise.get_outcome_display(),
                         'plan_version': exercise.plan.version} if exercise else None,
            'tasks': tasks.get(pk, []),
        }


class ISOEvidenceView(APIView):
    permission_classes = [IsTenantMember]

    def get(self, request):
        records = []
        for row in process_continuity(request.user.organization):
            plan = row['plan'] or {}
            readiness = plan.get('readiness', {})
            bia = row['bia'] or {}
            selected_strategy = row['strategy'] or {}
            checks = (
                ('8.2', 'Biznes ta’siri va risk bahosi', 'bia', bia.get('id'),
                 ([issue for condition, issue in (
                     (not bia, 'Tasdiqlangan BIA kerak.'),
                     (not row['risks'], 'Risk bahosi kerak.'),
                 ) if condition]), f"BIA v{bia.get('revision')}" if bia else None),
                ('8.3', 'Tiklash strategiyasi', 'strategies', selected_strategy.get('id'),
                 [] if selected_strategy else ['Tiklash strategiyasini tanlang.'], selected_strategy.get('label')),
                ('8.4', 'Uzluksizlik rejasi', 'plans', plan.get('id'),
                 readiness.get('missing_evidence', ['E’lon qilingan reja kerak.']), plan.get('label')),
                ('8.5', 'Tiklanish mashqi', 'exercises', readiness.get('verified_exercise_id'),
                 [] if readiness.get('exercise_verified') else ['Amaldagi rejani maqsadli tiklanish vaqtida sinang.'],
                 'Tasdiqlangan reja mashqi'),
            )
            for clause, label, resource, record_id, missing, evidence in checks:
                source_id = plan.get('id') if resource == 'plans' else (row['exercise'] or {}).get('id')
                task = next((item for item in row['tasks'] if item['due_date'] and source_id and (
                    (resource == 'plans' and item['plan_id'] == source_id and not item['exercise_id'])
                    or (resource == 'exercises' and item['exercise_id'] == source_id)
                )), {})
                records.append({
                    'clause': clause, 'label': label, 'resource': resource, 'record_id': record_id,
                    'evidence': evidence if record_id else None, 'missing': missing,
                    'process_id': row['id'], 'process_name': row['name'],
                    'owner': task.get('owner') or row['owner'],
                    'due_date': task.get('due_date') or (
                        plan.get('review_due_date') if resource in ('plans', 'exercises') else None
                    ),
                })
        return Response({'records': records})
