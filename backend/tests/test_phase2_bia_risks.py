import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.core.exceptions import ValidationError
from apps.organizations.models import Organization, Service
from apps.authentication.models import User
from apps.processes.models import BusinessProcess, Asset, Dependency
from apps.bia.models import BIAAssessment, BIAImpact
from apps.risks.models import Risk, Control
from apps.core.models import AuditLog


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def org(db):
    return Organization.objects.create(
        name="TATU Universitet",
        sector="Oliy ta'lim",
        timezone="Asia/Tashkent",
        max_acceptable_loss=500000000.00
    )


@pytest.fixture
def manager(db, org):
    return User.objects.create_user(
        username="bcms_manager",
        password="Password123!",
        role=User.ROLE_BCMS_MANAGER,
        organization=org
    )


@pytest.fixture
def approver(db, org):
    return User.objects.create_user(
        username="director_approver",
        password="Password123!",
        role=User.ROLE_APPROVER,
        organization=org
    )


@pytest.fixture
def service(db, org, manager):
    return Service.objects.create(
        organization=org,
        name="Elektron ta'lim xizmati (LMS)",
        owner=manager
    )


@pytest.mark.django_db
class TestPhase2ProcessesAndAssets:
    def test_t01_create_process_asset_and_dependency(self, api_client, manager, service):
        """T-01: Jarayon, egasi va kritik resurslar kiritiladi va bog'lanadi."""
        api_client.force_authenticate(user=manager)

        # 1. Jarayon yaratish
        proc_resp = api_client.post(reverse('process-list'), {
            'service': service.id,
            'name': 'Talabalar yakuniy nazorati',
            'criticality': 'CRITICAL'
        })
        assert proc_resp.status_code == 201
        proc_id = proc_resp.data['id']

        # 2. Server aktivi yaratish
        asset_resp = api_client.post(reverse('asset-list'), {
            'name': 'Asosiy PostgreSQL Server',
            'type': 'SERVER'
        })
        assert asset_resp.status_code == 201
        asset_id = asset_resp.data['id']

        # 3. Bog'liqlik (Dependency) yaratish: Jarayon -> Server
        dep_resp = api_client.post(reverse('dependency-list'), {
            'from_type': 'PROCESS',
            'from_id': proc_id,
            'to_type': 'ASSET',
            'to_id': asset_id,
            'dependency_criticality': 'MANDATORY'
        })
        assert dep_resp.status_code == 201
        assert Dependency.objects.filter(from_id=proc_id, to_id=asset_id).exists()


@pytest.mark.django_db
class TestPhase2BIAValidation:
    def test_t02_bia_valid_rto_mtpd(self, api_client, manager, service):
        """T-02: RTO=4 h, MTPD=12 h kiritiladi -> BIA muvaffaqiyatli qabul qilinadi."""
        proc = BusinessProcess.objects.create(
            organization=manager.organization,
            service=service,
            name="Imtihon topshirish",
            owner=manager
        )
        api_client.force_authenticate(user=manager)
        resp = api_client.post(reverse('bia-list'), {
            'process': proc.id,
            'rto_hours': '4.00',
            'mtpd_hours': '12.00',
            'rpo_minutes': 60,
            'backup_interval_minutes': 60
        })
        assert resp.status_code == 201
        assert BIAAssessment.objects.filter(process=proc).exists()

    def test_t03_bia_invalid_rto_greater_than_mtpd(self, api_client, manager, service):
        """T-03: RTO=18 h, MTPD=12 h kiritiladi -> Validatsiya xatosi (RTO <= MTPD buzilgan)."""
        proc = BusinessProcess.objects.create(
            organization=manager.organization,
            service=service,
            name="Diplom blanklarini chop etish",
            owner=manager
        )
        api_client.force_authenticate(user=manager)
        resp = api_client.post(reverse('bia-list'), {
            'process': proc.id,
            'rto_hours': '18.00',
            'mtpd_hours': '12.00',
            'rpo_minutes': 60
        })
        assert resp.status_code == 400
        assert 'rto_hours' in resp.data

    def test_t05_rpo_gap_detection(self, db, manager, service):
        """T-05: RPO=60 min, backup_interval=360 min -> RPO gap aniqlanadi."""
        proc = BusinessProcess.objects.create(
            organization=manager.organization,
            service=service,
            name="Talabalar bazasi",
            owner=manager
        )
        bia = BIAAssessment.objects.create(
            organization=manager.organization,
            process=proc,
            rto_hours=4.0,
            mtpd_hours=12.0,
            rpo_minutes=60,
            backup_interval_minutes=360
        )
        assert bia.has_rpo_gap is True

    def test_bia_approval_flow(self, api_client, approver, manager, service):
        """BIA tasdiqlash oqimi va audit qaydnomasi."""
        proc = BusinessProcess.objects.create(
            organization=manager.organization,
            service=service,
            name="Kutubxona xizmati",
            owner=manager
        )
        bia = BIAAssessment.objects.create(
            organization=manager.organization,
            process=proc,
            rto_hours=6.0,
            mtpd_hours=24.0,
            rpo_minutes=120
        )
        api_client.force_authenticate(user=approver)
        approve_url = reverse('bia-approve', kwargs={'pk': bia.id})
        resp = api_client.post(approve_url)
        assert resp.status_code == 200
        bia.refresh_from_db()
        assert bia.status == 'APPROVED'
        assert bia.approved_by == approver

        # Audit log mavjudligini tekshirish
        assert AuditLog.objects.filter(entity='BIAAssessment', action='APPROVE', actor=approver).exists()


@pytest.mark.django_db
class TestPhase2RisksAndControls:
    def test_t04_risk_score_calculation(self, api_client, manager, service):
        """T-04: Likelihood=4, Impact=5 kiritiladi -> Risk score = 20 (High)."""
        proc = BusinessProcess.objects.create(
            organization=manager.organization,
            service=service,
            name="To'lov tizimi integratsiyasi",
            owner=manager
        )
        api_client.force_authenticate(user=manager)
        resp = api_client.post(reverse('risk-list'), {
            'process': proc.id,
            'threat': 'Elektr ta\'minoti to\'liq uzilishi',
            'likelihood': 4,
            'impact': 5
        })
        assert resp.status_code == 201
        assert resp.data['risk_score'] == 20
        assert resp.data['risk_class'] == 'high'

    def test_t09_risk_controls_and_residual_score(self, api_client, manager, service):
        """T-09: Risk nazorati kiritilib qayta baholanadi -> Qoldiq risk va kamayishi hisoblanadi."""
        proc = BusinessProcess.objects.create(
            organization=manager.organization,
            service=service,
            name="DNS va Web portal",
            owner=manager
        )
        risk = Risk.objects.create(
            organization=manager.organization,
            process=proc,
            threat="DDoS hujumi",
            likelihood=5,
            impact=4 # Score = 20
        )
        assert risk.risk_score == 20

        # Nazorat chorasi qo'shish
        Control.objects.create(
            risk=risk,
            title="Cloudflare DDoS himoyasi va WAF",
            status="EFFECTIVE",
            effectiveness_evidence="Sinov hujumi qaytarildi"
        )

        # Qoldiq riskni yangilash
        risk.likelihood_residual = 2
        risk.impact_residual = 2
        risk.save()

        assert risk.residual_risk_score == 4
        assert risk.risk_reduction == 16 # 20 - 4 = 16
