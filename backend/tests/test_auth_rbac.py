import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.core.exceptions import PermissionDenied
from apps.organizations.models import Organization, Department, Service
from apps.authentication.models import User
from apps.core.models import AuditLog


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def org_a(db):
    return Organization.objects.create(
        name="Universitet A",
        sector="Oliy ta'lim",
        timezone="Asia/Tashkent",
        max_acceptable_loss=300000000.00
    )


@pytest.fixture
def org_b(db):
    return Organization.objects.create(
        name="Bank B",
        sector="Moliya",
        timezone="Asia/Tashkent",
        max_acceptable_loss=1000000000.00
    )


@pytest.fixture
def admin_a(db, org_a):
    user = User.objects.create_user(
        username="admin_a",
        password="SecurePassword123!",
        email="admin_a@test.uz",
        role=User.ROLE_ADMIN,
        organization=org_a
    )
    return user


@pytest.fixture
def auditor_a(db, org_a):
    user = User.objects.create_user(
        username="auditor_a",
        password="SecurePassword123!",
        email="auditor_a@test.uz",
        role=User.ROLE_AUDITOR,
        organization=org_a
    )
    return user


@pytest.fixture
def admin_b(db, org_b):
    user = User.objects.create_user(
        username="admin_b",
        password="SecurePassword123!",
        email="admin_b@test.uz",
        role=User.ROLE_ADMIN,
        organization=org_b
    )
    return user


@pytest.mark.django_db
class TestAuthenticationAndAudit:
    def test_login_successful_and_creates_audit_log(self, api_client, admin_a):
        """FR-01 va FR-12: Muvaffaqiyatli login va audit jurnali qayd etilishi."""
        url = reverse('auth-login')
        response = api_client.post(url, {
            'username': 'admin_a',
            'password': 'SecurePassword123!'
        })
        assert response.status_code == 200
        assert response.data['user']['username'] == 'admin_a'
        assert response.data['user']['role'] == User.ROLE_ADMIN

        # Audit log mavjudligini tekshirish
        audit_entry = AuditLog.objects.filter(actor=admin_a, action='LOGIN').first()
        assert audit_entry is not None
        assert audit_entry.organization == admin_a.organization

    def test_login_invalid_credentials_fails(self, api_client, admin_a):
        """Noto'g'ri parol kiritilganda 400 qaytarilishi."""
        url = reverse('auth-login')
        response = api_client.post(url, {
            'username': 'admin_a',
            'password': 'WrongPassword!'
        })
        assert response.status_code == 400

    def test_audit_log_immutability(self, db, org_a, admin_a):
        """FR-12: Audit log o'chirish va tahrirlash qat'iyan taqiqlangan."""
        log = AuditLog.objects.create(
            organization=org_a,
            actor=admin_a,
            action='CREATE',
            entity='Process',
            entity_id='1'
        )

        # Tahrirlash taqiqlangan
        with pytest.raises(PermissionDenied):
            log.action = 'UPDATE'
            log.save()

        # O'chirish taqiqlangan
        with pytest.raises(PermissionDenied):
            log.delete()


@pytest.mark.django_db
class TestRBACAndTenantIsolation:
    def test_auditor_cannot_create_user(self, api_client, auditor_a):
        """RBAC: Auditor yangi foydalanuvchi yarata olmaydi (Faqat o'qish huquqi)."""
        api_client.force_authenticate(user=auditor_a)
        url = reverse('user-list')
        response = api_client.post(url, {
            'username': 'new_user',
            'role': User.ROLE_PROCESS_OWNER
        })
        assert response.status_code == 403

    def test_tenant_data_isolation_users(self, api_client, admin_a, admin_b):
        """NFR-01 va T-08: Tashkilot A foydalanuvchisi Tashkilot B foydalanuvchilarini ko'ra olmaydi."""
        api_client.force_authenticate(user=admin_a)
        url = reverse('user-list')
        response = api_client.get(url)
        assert response.status_code == 200
        
        usernames = [u['username'] for u in response.data['results']]
        assert 'admin_a' in usernames
        assert 'admin_b' not in usernames

    def test_tenant_data_isolation_organization_update(self, api_client, admin_a, org_b):
        """NFR-01 va T-08: Tashkilot A foydalanuvchisi Tashkilot B profilini o'zgartira olmaydi (404/403)."""
        api_client.force_authenticate(user=admin_a)
        url = reverse('organization-detail', kwargs={'pk': org_b.id})
        response = api_client.patch(url, {'name': 'Hacked Name'})
        # Multi-tenant queryset filterlash tufayli begona tashkilot 404 qaytaradi
        assert response.status_code in [403, 404]
        org_b.refresh_from_db()
        assert org_b.name == "Bank B"
