import networkx as nx
from typing import Dict, Any, List
from apps.simulation.models import Scenario
from apps.processes.models import BusinessProcess, Asset, Dependency
from apps.engine.calculator import DependencyAnalyzer


class ScenarioSimulator:
    """
    FR-10: Ssenariy simulyatsiyasi va zanjirsimon ta'sir tahlili (T-06).
    Aktivlar ishdan chiqqanda ularga bog'liq barcha jarayonlarni aniqlaydi va
    RTO/MTPD buzilishlarini bashorat qiladi.
    """
    @classmethod
    def simulate(cls, scenario: Scenario) -> Dict[str, Any]:
        org = scenario.organization
        g = DependencyAnalyzer.build_graph(org)
        
        disrupted_asset_ids = scenario.disrupted_asset_ids or []
        affected_processes_ids = set()

        # Har bir nosoz aktiv uchun unga qaram bo'lgan tugunlarni topish
        for asset_id in disrupted_asset_ids:
            asset_node = f"ASSET:{asset_id}"
            if asset_node in g:
                # In-edges or ancestors: kim ushbu aktivga bog'langan
                dependents = nx.ancestors(g, asset_node)
                for dep in dependents:
                    if dep.startswith('PROCESS:'):
                        proc_id = int(dep.split(':')[1])
                        affected_processes_ids.add(proc_id)

            # Shuningdek, to'g'ridan-to'g'ri bog'liqliklar
            direct_deps = Dependency.objects.filter(
                organization=org,
                to_type='ASSET',
                to_id=asset_id,
                from_type='PROCESS'
            )
            for d in direct_deps:
                affected_processes_ids.add(d.from_id)

        affected_processes_data = []
        rto_breaches = 0
        mtpd_breaches = 0
        missing_plans = 0

        outage_hours = float(scenario.estimated_outage_hours)

        for pid in affected_processes_ids:
            try:
                proc = BusinessProcess.objects.get(id=pid, organization=org)
            except BusinessProcess.DoesNotExist:
                continue

            latest_bia = proc.bia_assessments.order_by('-revision').first()
            rto_h = float(latest_bia.rto_hours) if latest_bia else 24.0
            mtpd_h = float(latest_bia.mtpd_hours) if latest_bia else 48.0

            rto_breached = outage_hours > rto_h
            mtpd_breached = outage_hours > mtpd_h

            if rto_breached:
                rto_breaches += 1
            if mtpd_breached:
                mtpd_breaches += 1

            has_published_plan = proc.continuity_plans.filter(status='PUBLISHED').exists()
            if not has_published_plan:
                missing_plans += 1

            affected_processes_data.append({
                'process_id': proc.id,
                'process_name': proc.name,
                'service_name': proc.service.name,
                'criticality': proc.criticality,
                'target_rto_hours': rto_h,
                'target_mtpd_hours': mtpd_h,
                'rto_breached': rto_breached,
                'mtpd_breached': mtpd_breached,
                'has_published_plan': has_published_plan
            })

        return {
            'scenario_id': scenario.id,
            'scenario_title': scenario.title,
            'estimated_outage_hours': outage_hours,
            'disrupted_assets_count': len(disrupted_asset_ids),
            'affected_processes_count': len(affected_processes_data),
            'rto_breaches_count': rto_breaches,
            'mtpd_breaches_count': mtpd_breaches,
            'missing_plans_count': missing_plans,
            'affected_processes': affected_processes_data
        }
