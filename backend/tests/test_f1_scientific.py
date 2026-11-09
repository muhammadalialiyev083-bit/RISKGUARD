"""F1: Ilmiy mustahkamlash testlari — sezgirlik, Kendall-tau, holat mashinasi, graf semantikasi."""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.organizations.models import Organization, Service
from apps.authentication.models import User
from apps.processes.models import BusinessProcess, Asset, Dependency
from apps.bia.models import BIAAssessment
from apps.plans.models import ContinuityPlan
from apps.simulation.models import Scenario
from apps.engine.sensitivity import (
    kendall_tau, sweep_weights, ablate_operands, sweep_tmax, sweep_thresholds,
)
from apps.engine.calculator import DependencyAnalyzer, PriorityEngine


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def setup(db):
    org = Organization.objects.create(name="F1 Org", sector="Test", timezone="Asia/Tashkent")
    manager = User.objects.create_user(username="f1_mgr", password="Pw123456!", role=User.ROLE_BCMS_MANAGER, organization=org)
    approver = User.objects.create_user(username="f1_appr", password="Pw123456!", role=User.ROLE_APPROVER, organization=org)
    service = Service.objects.create(organization=org, name="F1 Service", owner=manager)
    return {'org': org, 'manager': manager, 'approver': approver, 'service': service}


def _operands(n=4):
    base = [
        {'id': 1, 'operands': {'impact_norm': 0.9, 'urgency_norm': 0.8, 'risk_norm': 0.7, 'dependency_norm': 0.1}},
        {'id': 2, 'operands': {'impact_norm': 0.6, 'urgency_norm': 0.5, 'risk_norm': 0.5, 'dependency_norm': 0.2}},
        {'id': 3, 'operands': {'impact_norm': 0.3, 'urgency_norm': 0.4, 'risk_norm': 0.2, 'dependency_norm': 0.0}},
        {'id': 4, 'operands': {'impact_norm': 0.1, 'urgency_norm': 0.2, 'risk_norm': 0.1, 'dependency_norm': 0.0}},
    ]
    return base[:n]


BASE_W = {'impact': 0.40, 'urgency': 0.25, 'risk': 0.20, 'dependency': 0.15}


class TestKendallTau:
    def test_identical_is_one(self):
        assert kendall_tau([1, 2, 3], [1, 2, 3]) == 1.0

    def test_reversed_is_minus_one(self):
        assert kendall_tau([1, 2, 3], [3, 2, 1]) == -1.0

    def test_single_element(self):
        assert kendall_tau([1], [1]) == 1.0

    def test_mismatched_sets_raise(self):
        with pytest.raises(ValueError):
            kendall_tau([1, 2], [1, 3])

    def test_swap_gives_expected_value(self):
        # 4 elementdan 1 ta qo'shni almashtirish: 5/6 mos, 1/6 nomuvofiq -> (5-1)/6
        assert kendall_tau([1, 2, 3, 4], [1, 3, 2, 4]) == pytest.approx(0.6667, abs=1e-3)


class TestSensitivity:
    def test_sweep_weights_deterministic(self):
        r1 = sweep_weights(_operands(), BASE_W, delta=0.05)
        r2 = sweep_weights(_operands(), BASE_W, delta=0.05)
        assert r1 == r2
        assert r1['base_rank'][0] == 1  # eng kuchli operandlar birinchi
        assert set(r1['per_weight'].keys()) == {'impact_norm', 'urgency_norm', 'risk_norm', 'dependency_norm'}
        assert -1.0 <= r1['min_tau_overall'] <= 1.0

    def test_ablate_runs_and_changes_rank(self):
        res = ablate_operands(_operands(), BASE_W)
        assert set(res['per_operand'].keys()) == {'impact_norm', 'urgency_norm', 'risk_norm', 'dependency_norm'}
        for v in res['per_operand'].values():
            assert -1.0 <= v['tau_vs_base'] <= 1.0

    def test_sweep_tmax_monotonic(self):
        res = sweep_tmax([4.0, 24.0, 48.0, 60.0])
        v72 = res['urgency_vectors']['72.0']
        assert v72[0] > v72[1] > v72[2] > v72[3] > 0.0
        # Kichik T_MAX da urgency past (keskinroq)
        assert res['urgency_vectors']['48.0'][1] < v72[1]

    def test_sweep_thresholds_base_stable(self):
        res = sweep_thresholds([4, 6, 7, 14, 15, 20, 25])
        assert res['base_labels'] == ['low', 'low', 'medium', 'medium', 'high', 'high', 'high']
        assert 'low=6,med=14' in res['variants']
        assert res['variants']['low=6,med=14']['changed_vs_base'] == 0


@pytest.mark.django_db
class TestStateMachine:
    def test_bia_reapprove_rejected(self, api_client, setup):
        proc = BusinessProcess.objects.create(organization=setup['org'], service=setup['service'], name="P1")
        bia = BIAAssessment.objects.create(organization=setup['org'], process=proc, rto_hours=4, mtpd_hours=12)
        api_client.force_authenticate(user=setup['approver'])
        url = reverse('bia-approve', kwargs={'pk': bia.id})
        assert api_client.post(url).status_code == 200
        second = api_client.post(url)  # APPROVED -> APPROVED taqiqlangan
        assert second.status_code == 400

        bia2 = BIAAssessment.objects.create(organization=setup['org'], process=proc, rto_hours=2, mtpd_hours=8, status='REJECTED')
        url2 = reverse('bia-approve', kwargs={'pk': bia2.id})
        assert api_client.post(url2).status_code == 400  # avval DRAFT ga qaytishi shart

    def test_plan_republish_and_archived_rejected(self, api_client, setup):
        proc = BusinessProcess.objects.create(organization=setup['org'], service=setup['service'], name="P2")
        plan = ContinuityPlan.objects.create(organization=setup['org'], process=proc, title="R1", status="DRAFT")
        api_client.force_authenticate(user=setup['approver'])
        url = reverse('plan-publish', kwargs={'pk': plan.id})
        assert api_client.post(url).status_code == 200
        assert api_client.post(url).status_code == 400  # qayta publish yo'q

        plan2 = ContinuityPlan.objects.create(organization=setup['org'], process=proc, title="R2", status="ARCHIVED")
        url2 = reverse('plan-publish', kwargs={'pk': plan2.id})
        assert api_client.post(url2).status_code == 400


@pytest.mark.django_db
class TestGraphSemantics:
    def test_process_to_process_dependency_norm(self, setup):
        """P1 -> P2 (P1 P2 ga bog'langan): ancestors(P2) da P1 bor -> dep_norm(P2) > 0."""
        org, service = setup['org'], setup['service']
        p1 = BusinessProcess.objects.create(organization=org, service=service, name="GP1")
        p2 = BusinessProcess.objects.create(organization=org, service=service, name="GP2")
        Dependency.objects.create(organization=org, from_type='PROCESS', from_id=p1.id, to_type='PROCESS', to_id=p2.id)
        assert DependencyAnalyzer.calculate_dependency_norm(org, p2.id) > 0.0
        assert DependencyAnalyzer.calculate_dependency_norm(org, p1.id) == 0.0

    def test_simulator_cascade_uses_ancestors(self, api_client, setup):
        """PROCESS -> ASSET yo'nalishida ancestors(ASSET) jarayonlarni topadi (regressiya)."""
        org, service, manager = setup['org'], setup['service'], setup['manager']
        asset = Asset.objects.create(organization=org, name="A1", type="SERVER")
        procs = [BusinessProcess.objects.create(organization=org, service=service, name=f"SP{i}") for i in range(2)]
        for p in procs:
            Dependency.objects.create(organization=org, from_type='PROCESS', from_id=p.id, to_type='ASSET', to_id=asset.id)
            BIAAssessment.objects.create(organization=org, process=p, rto_hours=4, mtpd_hours=12)
        sc = Scenario.objects.create(organization=org, title="S1", disrupted_asset_ids=[asset.id], estimated_outage_hours=8.0)
        api_client.force_authenticate(user=manager)
        resp = api_client.post(reverse('scenario-simulate', kwargs={'pk': sc.id}))
        assert resp.status_code == 200
        assert resp.data['affected_processes_count'] == 2

    def test_priority_formula_unchanged(self, setup):
        """Dissertatsiya formulasi o'zgarmagani: vaznlar va T_MAX sabit."""
        assert PriorityEngine.WEIGHTS == {'impact': 0.40, 'urgency': 0.25, 'risk': 0.20, 'dependency': 0.15}
        assert PriorityEngine.T_MAX_HOURS == 72.0
