"""Create a fictional, isolated workspace for the public demo."""

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.authentication.models import User
from apps.bia.models import BIAAssessment, BIAImpact
from apps.core.audit import record_audit
from apps.operations.models import ImprovementTask, Incident, IncidentEvent, Provider, SimulationRun
from apps.organizations.models import Department, Organization, Service
from apps.plans.models import ContinuityPlan, PlanStep, Strategy
from apps.plans.readiness import publication_snapshot
from apps.processes.models import Asset, BusinessProcess, Dependency
from apps.risks.models import Control, Risk
from apps.simulation.models import Exercise, Scenario
from apps.simulation.simulator import ScenarioSimulator

DEMO_ORGANIZATION = 'Navro‘z universiteti · Demo'


class DemoUnavailable(Exception):
    """A reserved organization or account could not be used safely."""


@transaction.atomic
def demo_viewer():
    organization, created = Organization.objects.get_or_create(
        name=DEMO_ORGANIZATION,
        defaults={'sector': 'Oliy ta’lim', 'is_demo': True},
    )
    if not organization.is_demo:
        raise DemoUnavailable
    if created:
        populate_workspace(organization)
    viewer = organization.users.filter(username=User.DEMO_USERNAME).first()
    if viewer is None or not viewer.is_demo_viewer:
        raise DemoUnavailable
    return viewer


def populate_workspace(organization):
    now = timezone.now()
    today = timezone.localdate(now)
    technology = Department.objects.create(
        organization=organization, name='Raqamli ta’lim markazi', head_name='Demo koordinatori',
    )
    finance = Department.objects.create(
        organization=organization, name='Moliya bo‘limi', head_name='Demo moliya rahbari',
    )
    User.objects.create_user(
        username=User.DEMO_USERNAME, organization=organization, role=User.ROLE_AUDITOR,
        first_name='Demo', last_name='kuzatuvchi', email='viewer@uzhi-demo.invalid',
    )
    manager = User.objects.create_user(
        username=f'uzhi_demo_{organization.pk}_manager', organization=organization, department=technology,
        role=User.ROLE_BCMS_MANAGER, first_name='Demo', last_name='koordinatori',
        email='coordinator@uzhi-demo.invalid',
    )
    approver = User.objects.create_user(
        username=f'uzhi_demo_{organization.pk}_approver', organization=organization, department=finance,
        role=User.ROLE_APPROVER, first_name='Demo', last_name='tasdiqlovchisi',
        email='approver@uzhi-demo.invalid',
    )

    learning = Service.objects.create(
        organization=organization, name='Elektron ta’lim xizmati', owner=manager,
        description='Dars, topshiriq va imtihonlardan foydalanish.',
    )
    payments = Service.objects.create(
        organization=organization, name='Talabalar to‘lovi', owner=approver,
        description='Shartnoma to‘lovlarini qabul qilish va hisobga olish.',
    )
    classroom = BusinessProcess.objects.create(
        organization=organization, service=learning, department=technology, owner=manager,
        name='Masofaviy darslarni o‘tkazish', criticality='CRITICAL', required_staff=2,
    )
    exams = BusinessProcess.objects.create(
        organization=organization, service=learning, department=technology, owner=manager,
        name='Onlayn imtihonni o‘tkazish', criticality='HIGH', required_staff=2,
    )
    billing = BusinessProcess.objects.create(
        organization=organization, service=payments, department=finance, owner=approver,
        name='Shartnoma to‘lovlarini tasdiqlash', criticality='HIGH',
    )
    link = Asset.objects.create(
        organization=organization, name='Asosiy internet kanali', type='VENDOR', owner=manager,
    )
    Asset.objects.create(
        organization=organization, name='Zaxira aloqa kanali', type='FACILITY', owner=manager,
    )
    server = Asset.objects.create(
        organization=organization, name='O‘quv platformasi serveri', type='SERVER', owner=manager,
    )
    gateway = Asset.objects.create(
        organization=organization, name='To‘lov shlyuzi', type='SYSTEM', owner=approver,
    )
    for source, target in ((classroom, server), (exams, server), (billing, gateway), (server, link)):
        Dependency.objects.create(
            organization=organization,
            from_type='ASSET' if isinstance(source, Asset) else 'PROCESS', from_id=source.pk,
            to_type='ASSET', to_id=target.pk, dependency_criticality='MANDATORY',
        )

    approved_at = now - timedelta(days=12)
    classroom_bia = BIAAssessment.objects.create(
        organization=organization, process=classroom, status='APPROVED',
        rto_hours=2, mtpd_hours=8, rpo_minutes=30, backup_interval_minutes=60,
        approved_by=approver, approved_at=approved_at, data_source='Namunaviy darslar taqvimi',
    )
    billing_bia = BIAAssessment.objects.create(
        organization=organization, process=billing, status='APPROVED',
        rto_hours=4, mtpd_hours=24, rpo_minutes=60, backup_interval_minutes=30,
        approved_by=approver, approved_at=approved_at,
    )
    BIAAssessment.objects.create(
        organization=organization, process=exams, rto_hours=4, mtpd_hours=6,
        rpo_minutes=30, backup_interval_minutes=30,
    )
    for assessment in (classroom_bia, billing_bia):
        BIAImpact.objects.create(
            bia=assessment, horizon_hours=assessment.rto_hours,
            financial_loss=12000000, operational_score=4, legal_score=2, reputational_score=3,
        )

    outage_risk = Risk.objects.create(
        organization=organization, process=classroom, asset=link, owner=manager,
        threat='Asosiy provayder aloqasi uzilishi', likelihood=4, impact=5, status='ASSESSED',
        likelihood_residual=2, impact_residual=3, due_date=today + timedelta(days=10),
    )
    Risk.objects.create(
        organization=organization, process=billing, asset=gateway, owner=approver,
        threat='To‘lov xabari kechikishi', likelihood=2, impact=3, status='ASSESSED',
    )
    Control.objects.create(
        risk=outage_risk, title='Zaxira aloqa kanalini tekshirish', owner=manager,
        status='IMPLEMENTED', effectiveness_evidence='Demo mashqda kanal 20 daqiqada ulandi.',
    )
    Strategy.objects.create(
        organization=organization, process=classroom, name='Zaxira aloqa kanaliga o‘tish',
        estimated_rto_hours=1, estimated_rpo_minutes=15, estimated_cost=12000000, is_selected=True,
    )
    Strategy.objects.create(
        organization=organization, process=classroom, name='Darslarni zaxira platformaga ko‘chirish',
        estimated_rto_hours=3, estimated_rpo_minutes=30, estimated_cost=7000000,
    )

    plan = ContinuityPlan.objects.create(
        organization=organization, process=classroom, title='Elektron ta’limni tiklash rejasi',
        scope='Masofaviy darslar va o‘quv materiallari.',
        activation_conditions='Asosiy aloqa kanali uzilishi.',
        temporary_procedures='Zaxira tarmoq orqali ustuvor darslarni tiklash.',
        verification_criteria='O‘qituvchi va talabalar sinov darsiga ulana olishi.',
        return_to_normal='Asosiy kanal barqarorlashgach ulanishlarni qaytarish.',
        review_due_date=today + timedelta(days=30),
    )
    for sequence, title, minutes in (
        (1, 'Mas’ullarni xabardor qilish', 10),
        (2, 'Zaxira aloqa kanalini ulash', 35),
        (3, 'Sinov darsi orqali xizmatni tekshirish', 25),
    ):
        PlanStep.objects.create(
            plan=plan, sequence=sequence, title=title,
            assigned_to=manager, expected_duration_minutes=minutes,
        )
    plan.status = 'PUBLISHED'
    plan.approved_by = approver
    plan.approved_at = approved_at
    classroom_bia.refresh_from_db(fields=['rto_hours', 'mtpd_hours'])
    plan.snapshot = publication_snapshot(plan, classroom_bia)
    plan.save(update_fields=['status', 'approved_by', 'approved_at', 'snapshot'])
    ContinuityPlan.objects.create(
        organization=organization, process=billing, title='Talabalar to‘lovini tiklash rejasi',
    )

    provider = Provider.objects.create(
        organization=organization, name='Navro‘z aloqa provayderi', owner=manager,
        contact_email='support@navroz-demo.invalid', risk_rating='HIGH',
        next_review_date=today + timedelta(days=14),
    )
    provider.services.add(learning)
    provider.assets.add(link)
    scenario = Scenario.objects.create(
        organization=organization, title='Provayderning 6 soatlik uzilishi',
        description='Asosiy kanal uzilgan va zaxira kanal hozircha ishga tushmagan.',
        disrupted_asset_ids=[link.pk], estimated_outage_hours=6,
        event_time=now, is_synthetic=True,
    )
    exercise = Exercise.objects.create(
        organization=organization, plan=plan, scenario=scenario,
        exercise_date=today - timedelta(days=5), actual_recovery_hours=1.25,
        outcome='SUCCESS', findings='Aloqa ro‘yxatini yangilash kerak.',
    )
    run = SimulationRun.objects.create(
        organization=organization, scenario=scenario, created_by=manager,
        result=ScenarioSimulator.simulate(scenario),
    )
    incident = Incident.objects.create(
        organization=organization, title='Asosiy internet kanalida uzilish',
        description='O‘quv platformasiga ulanish vaqtincha uzildi.',
        severity='HIGH', status='RECOVERING', owner=manager, provider=provider,
        plan=plan, scenario=scenario, asset=link,
    )
    IncidentEvent.objects.create(
        incident=incident, actor=manager, event='STATUS',
        message='Zaxira aloqa kanali ishga tushirilmoqda.',
    )
    ImprovementTask.objects.create(
        organization=organization, title='Zaxira kanal ulanishini tezlashtirish',
        description='Provayder bilan avariyaviy ulanish ketma-ketligini tekshirish.',
        owner=manager, status='IN_PROGRESS', due_date=today - timedelta(days=1),
        incident=incident, scenario=scenario, simulation_run=run, process=classroom, plan=plan,
    )
    ImprovementTask.objects.create(
        organization=organization, title='Mashqdan keyin aloqa ro‘yxatini yangilash',
        owner=manager, due_date=today + timedelta(days=7), exercise=exercise, plan=plan, process=classroom,
    )
    for action, record, actor, state in (
        ('CREATE', organization, manager, {'name': organization.name, 'demo': True}),
        ('APPROVE', classroom_bia, approver, {'status': 'APPROVED', 'revision': classroom_bia.revision}),
        ('APPROVE', plan, approver, {'status': 'PUBLISHED', 'bia': plan.snapshot['bia']}),
        ('SIMULATE', run, manager, {'scenario': scenario.title, 'estimated_outage_hours': 6}),
        ('CREATE', incident, manager, {'title': incident.title, 'status': incident.status}),
    ):
        record_audit(
            action=action, actor=actor, organization=organization, entity=type(record).__name__,
            entity_id=record.pk, after_state=state,
        )
