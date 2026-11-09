import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.organizations.models import Organization, Service
from apps.authentication.models import User
from apps.processes.models import BusinessProcess, Asset, Dependency
from apps.bia.models import BIAAssessment, BIAImpact
from apps.risks.models import Risk
from apps.plans.models import ContinuityPlan, PlanStep, Strategy
from apps.simulation.models import Scenario
from apps.core.models import AuditLog


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_setup(db):
    org = Organization.objects.create(
        name="Toshkent Davlat Universiteti",
        sector="Oliy ta'lim",
        timezone="Asia/Tashkent",
        max_acceptable_loss=500000000.00
    )
    manager = User.objects.create_user(
        username="bcms_lead",
        password="Password123!",
        role=User.ROLE_BCMS_MANAGER,
        organization=org
    )
    approver = User.objects.create_user(
        username="director_approver",
        password="Password123!",
        role=User.ROLE_APPROVER,
        organization=org
    )
    service = Service.objects.create(
        organization=org,
        name="Talabalar axborot xizmati",
        owner=manager
    )
    return {
        'org': org,
        'manager': manager,
        'approver': approver,
        'service': service
    }


@pytest.mark.django_db
class TestPhase3CalculationEngine:
    def test_section_10_1_algorithm_api_sample(self, api_client, test_setup):
        """
        FR-07 va Hujjat 10.1 spetsifikatsiyasi:
        So'rov: {"process_id": 12, "likelihood": 4, "impact": 5, "rto_hours": 4, "rpo_minutes": 60, "backup_interval_minutes": 360}
        Javob: {"risk_score": 20, "risk_class": "high", "rpo_gap": true, "observations": ["Zaxiralash intervali RPO talabidan katta"]}
        """
        api_client.force_authenticate(user=test_setup['manager'])
        url = reverse('analysis-evaluate-risk')
        response = api_client.post(url, {
            'process_id': 12,
            'likelihood': 4,
            'impact': 5,
            'rto_hours': 4,
            'rpo_minutes': 60,
            'backup_interval_minutes': 360
        })
        assert response.status_code == 200
        assert response.data['risk_score'] == 20
        assert response.data['risk_class'] == 'high'
        assert response.data['rpo_gap'] is True
        assert "Zaxiralash intervali RPO talabidan katta" in response.data['observations']

    def test_priority_engine_calculation(self, api_client, test_setup):
        """FR-07: Ustuvorlik indeksi (Priority = 0.40*Impact + 0.25*Urgency + 0.20*Risk + 0.15*Dep)."""
        manager = test_setup['manager']
        org = test_setup['org']
        service = test_setup['service']

        proc = BusinessProcess.objects.create(
            organization=org,
            service=service,
            name="Imtihon qabul qilish jarayoni",
            criticality="CRITICAL"
        )
        bia = BIAAssessment.objects.create(
            organization=org,
            process=proc,
            rto_hours=4.0,
            mtpd_hours=12.0,
            rpo_minutes=60,
            backup_interval_minutes=30
        )
        BIAImpact.objects.create(
            bia=bia,
            horizon_hours=12.0,
            financial_loss=100000000.00,
            operational_score=5,
            legal_score=4,
            reputational_score=4
        )
        Risk.objects.create(
            organization=org,
            process=proc,
            threat="Server buzilishi",
            likelihood=4,
            impact=5
        )

        api_client.force_authenticate(user=manager)
        url = reverse('analysis-priority')
        response = api_client.post(url, {'process_id': proc.id})
        assert response.status_code == 200
        data = response.data

        assert 'priority_score' in data
        assert data['priority_score'] > 0.0
        assert 'operands' in data
        assert data['operands']['impact_norm'] > 0.0
        assert data['operands']['urgency_norm'] > 0.0
        assert data['operands']['risk_norm'] > 0.0

    def test_fr08_strategy_evaluation(self, api_client, test_setup):
        """
        FR-08 va Hujjat 7.3: Tiklash strategiyasini tanlash.
        Variant A (RTO=8h, RPO=360m) - mos emas.
        Variant B (RTO=2h, RPO=30m) - mos (narxi kichikroq tavsiya etiladi).
        """
        api_client.force_authenticate(user=test_setup['manager'])
        url = reverse('analysis-evaluate-strategy')
        response = api_client.post(url, {
            'target_rto_hours': 4.0,
            'target_rpo_minutes': 60,
            'strategies': [
                {
                    'name': 'Variant A (Oddiy zaxira)',
                    'estimated_rto_hours': 8.0,
                    'estimated_rpo_minutes': 360,
                    'cost': 5000000.0
                },
                {
                    'name': 'Variant B (Issiq zaxira server)',
                    'estimated_rto_hours': 2.0,
                    'estimated_rpo_minutes': 30,
                    'cost': 25000000.0
                }
            ]
        }, format='json')
        assert response.status_code == 200
        assert response.data['status'] == 'OPTIMAL_FOUND'
        assert response.data['recommended_strategy']['name'] == 'Variant B (Issiq zaxira server)'


@pytest.mark.django_db
class TestPhase4SimulationAndReports:
    def test_t06_cascade_disruption_scenario(self, api_client, test_setup):
        """
        T-06: Yagona server 3 ta jarayonni ta'minlaydi.
        Server uzilganda 3 ta jarayon ta'sirlangan deb belgilanadi.
        """
        manager = test_setup['manager']
        org = test_setup['org']
        service = test_setup['service']

        server_asset = Asset.objects.create(
            organization=org,
            name="Markaziy DB Klaster",
            type="SERVER"
        )

        # 3 ta biznes jarayon yaratish
        p1 = BusinessProcess.objects.create(organization=org, service=service, name="Elektron ta'lim")
        p2 = BusinessProcess.objects.create(organization=org, service=service, name="Talabalar hisoboti")
        p3 = BusinessProcess.objects.create(organization=org, service=service, name="To'lovlar")

        # 3 ta jarayonni serverga bog'lash
        for p in [p1, p2, p3]:
            Dependency.objects.create(
                organization=org,
                from_type='PROCESS',
                from_id=p.id,
                to_type='ASSET',
                to_id=server_asset.id,
                dependency_criticality='MANDATORY'
            )
            BIAAssessment.objects.create(
                organization=org,
                process=p,
                rto_hours=4.0,
                mtpd_hours=12.0,
                rpo_minutes=60
            )

        # Ssenariy yaratish: Server ishdan chiqishi (uzilish 8 soat)
        scenario = Scenario.objects.create(
            organization=org,
            title="Markaziy DB Klaster avariyasi",
            disrupted_asset_ids=[server_asset.id],
            estimated_outage_hours=8.0
        )

        api_client.force_authenticate(user=manager)
        sim_url = reverse('scenario-simulate', kwargs={'pk': scenario.id})
        resp = api_client.post(sim_url)
        assert resp.status_code == 200
        data = resp.data

        # 3 ta jarayon ta'sirlangan bo'lishi shart (T-06)
        assert data['affected_processes_count'] == 3
        # 8h > 4h bo'lgani uchun barcha 3 ta jarayon RTO buzilishiga uchraydi
        assert data['rto_breaches_count'] == 3

    def test_t07_and_t10_plan_publish_and_pdf_export(self, api_client, test_setup):
        """
        T-07: Reja tasdiqlanib e'lon qilinadi -> Audit jurnali yoziladi.
        T-10: Reja PDF formatida eksport qilinadi -> Valid PDF oqimi.
        """
        org = test_setup['org']
        service = test_setup['service']
        approver = test_setup['approver']

        proc = BusinessProcess.objects.create(organization=org, service=service, name="Kutubxona xizmati")
        plan = ContinuityPlan.objects.create(
            organization=org,
            process=proc,
            title="Kutubxona avariyaviy tiklash rejasi",
            version="1.0",
            status="DRAFT"
        )
        PlanStep.objects.create(
            plan=plan,
            sequence=1,
            title="Zaxira nusxani tekshirish",
            assigned_to=approver,
            expected_duration_minutes=20
        )

        api_client.force_authenticate(user=approver)

        # T-07: Tasdiqlash va e'lon qilish
        pub_url = reverse('plan-publish', kwargs={'pk': plan.id})
        pub_resp = api_client.post(pub_url)
        assert pub_resp.status_code == 200
        plan.refresh_from_db()
        assert plan.status == 'PUBLISHED'
        assert plan.approved_by == approver
        assert AuditLog.objects.filter(entity='ContinuityPlan', action='APPROVE', actor=approver).exists()

        # T-10: PDF eksport
        pdf_url = reverse('plan-export-pdf', kwargs={'pk': plan.id})
        pdf_resp = api_client.get(pdf_url)
        assert pdf_resp.status_code == 200
        assert pdf_resp['Content-Type'] == 'application/pdf'
        assert pdf_resp.content.startswith(b'%PDF')

    def test_fr11_dashboard_report_consolidation(self, api_client, test_setup):
        """FR-11: Dashboard konsolidatsiyasi statistikasi to'g'ri qaytishi."""
        api_client.force_authenticate(user=test_setup['manager'])
        url = reverse('report-dashboard')
        resp = api_client.get(url)
        assert resp.status_code == 200
        assert 'summary' in resp.data
        summary = resp.data['summary']
        assert 'total_processes' in summary
        assert 'critical_processes' in summary
        assert 'total_risks' in summary
        assert 'high_risks_count' in summary
        assert 'unplanned_processes_count' in summary
        assert 'rpo_gap_count' in summary
