import networkx as nx

from apps.engine.calculator import DependencyAnalyzer
from apps.plans.readiness import approved_assessments, current_plan, published_plan_readiness
from apps.processes.models import Asset, BusinessProcess


class ScenarioSimulator:
    @classmethod
    def simulate(cls, scenario):
        organization = scenario.organization
        graph = DependencyAnalyzer.build_graph(organization)
        reverse = graph.reverse(copy=False)
        disrupted = sorted(set(scenario.disrupted_asset_ids or []))
        paths_by_asset = {
            asset: nx.single_source_shortest_path(reverse, f'ASSET:{asset}')
            for asset in disrupted if f'ASSET:{asset}' in graph
        }
        resources = scenario.available_resources
        backup_assets = resources.get('backup_assets', {}) if isinstance(resources, dict) else {}
        if not isinstance(backup_assets, dict):
            backup_assets = {}
        backups = Asset.objects.active().filter(
            organization=organization, pk__in=backup_assets.values(),
        ).in_bulk()
        paths = {}
        backup_results = []
        for asset_id in disrupted:
            backup = backups.get(backup_assets.get(str(asset_id)))
            if str(asset_id) in backup_assets:
                available = bool(backup and backup.pk not in disrupted and not any(
                    f'ASSET:{backup.pk}' in reached for reached in paths_by_asset.values()
                ))
                backup_results.append({'asset_id': asset_id, 'backup_asset_id': backup_assets[str(asset_id)],
                                       'available': available})
                if available:
                    continue
            for node, path in paths_by_asset.get(asset_id, {}).items():
                if node.startswith('PROCESS:'):
                    paths.setdefault(int(node.split(':')[1]), []).append(path)

        processes = BusinessProcess.objects.active().filter(organization=organization, pk__in=paths).select_related('service')
        assessments = approved_assessments(paths)
        plans = published_plan_readiness(paths, assessments)
        affected = []
        for process in processes.order_by('pk'):
            bia = assessments.get(process.pk)
            outage = scenario.estimated_outage_hours
            plan, readiness = current_plan(plans.get(process.pk, []))
            affected.append({
                'process_id': process.pk, 'process_name': process.name,
                'service_name': process.service.name, 'criticality': process.criticality,
                'assessment_status': 'APPROVED' if bia else 'UNASSESSED',
                'bia_id': bia.pk if bia else None, 'bia_revision': bia.revision if bia else None,
                'target_rto_hours': float(bia.rto_hours) if bia else None,
                'target_mtpd_hours': float(bia.mtpd_hours) if bia else None,
                'target_rpo_minutes': bia.rpo_minutes if bia else None,
                'rpo_gap': bia.has_rpo_gap if bia else None,
                'rto_breached': outage > bia.rto_hours if bia else None,
                'mtpd_breached': outage > bia.mtpd_hours if bia else None,
                'dependency_paths': paths[process.pk],
                'has_published_plan': bool(plan and not readiness['needs_review']),
                'plan_id': plan.pk if plan else None,
                'plan_version': plan.version if plan else None,
                'plan_needs_review': bool(readiness and readiness['needs_review']),
            })

        node_ids = {node for person in affected for path in person['dependency_paths'] for node in path}
        names = {}
        for kind, model in (('ASSET', Asset), ('PROCESS', BusinessProcess)):
            ids = [int(node.split(':')[1]) for node in node_ids if node.startswith(kind + ':')]
            for pk, name in model.objects.filter(organization=organization, pk__in=ids).values_list('pk', 'name'):
                names[f'{kind}:{pk}'] = name

        return {
            'scenario_id': scenario.id, 'scenario_title': scenario.title,
            'estimated_outage_hours': float(scenario.estimated_outage_hours),
            'disrupted_assets_count': len(disrupted),
            'affected_processes_count': len(affected),
            'rto_breaches_count': sum(row['rto_breached'] is True for row in affected),
            'mtpd_breaches_count': sum(row['mtpd_breached'] is True for row in affected),
            'unassessed_count': sum(row['bia_id'] is None for row in affected),
            'missing_plans_count': sum(not row['has_published_plan'] for row in affected),
            'affected_processes': affected, 'dependency_names': names, 'backup_results': backup_results,
        }
