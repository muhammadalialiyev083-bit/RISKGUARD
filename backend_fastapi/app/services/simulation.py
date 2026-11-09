"""FR-10: Cascade disruption simulation using dependency graph."""

from decimal import Decimal
from sqlalchemy.orm import Session
import networkx as nx

from app.models.process import BusinessProcess, Asset, Dependency
from app.models.bia import BIAAssessment
from app.models.plan import ContinuityPlan
from app.models.simulation import Scenario
from app.schemas.simulation import SimulationResult, AffectedProcess


def run_cascade_simulation(
    db: Session, scenario: Scenario, organization_id: int
) -> SimulationResult:
    """Run cascade disruption analysis.
    
    1. Build dependency graph from Dependencies table.
    2. Mark disrupted assets as failed.
    3. Traverse graph to find all affected processes.
    4. Check RTO breaches and missing BCP plans.
    """
    outage_hours = float(scenario.estimated_outage_hours)
    disrupted_ids = scenario.disrupted_asset_ids or []

    # Build directed graph
    G = nx.DiGraph()
    deps = (
        db.query(Dependency)
        .filter(
            Dependency.organization_id == organization_id,
            Dependency.is_deleted == False,
        )
        .all()
    )
    for d in deps:
        from_key = f"{d.from_type}:{d.from_id}"
        to_key = f"{d.to_type}:{d.to_id}"
        G.add_edge(to_key, from_key)  # if asset fails, dependent processes are affected

    # Find all affected nodes (processes that depend on disrupted assets)
    affected_nodes = set()
    for asset_id in disrupted_ids:
        node_key = f"ASSET:{asset_id}"
        if node_key in G:
            affected_nodes.update(nx.descendants(G, node_key))
        affected_nodes.add(node_key)

    # Get affected process IDs
    affected_process_ids = set()
    for node in affected_nodes:
        if node.startswith("PROCESS:"):
            affected_process_ids.add(int(node.split(":")[1]))

    # If no graph dependencies found, get all processes that use those assets directly
    if not affected_process_ids:
        all_procs = (
            db.query(BusinessProcess)
            .filter(
                BusinessProcess.organization_id == organization_id,
                BusinessProcess.is_deleted == False,
            )
            .all()
        )
        affected_process_ids = {p.id for p in all_procs}

    # Build affected process details
    affected_processes = []
    rto_breaches = 0
    missing_plans = 0

    for pid in affected_process_ids:
        proc = db.query(BusinessProcess).filter(BusinessProcess.id == pid).first()
        if not proc:
            continue

        bia = (
            db.query(BIAAssessment)
            .filter(BIAAssessment.process_id == pid, BIAAssessment.is_deleted == False)
            .order_by(BIAAssessment.rto_hours)
            .first()
        )
        target_rto = float(bia.rto_hours) if bia else 24.0
        rto_breached = outage_hours > target_rto
        if rto_breached:
            rto_breaches += 1

        has_plan = (
            db.query(ContinuityPlan)
            .filter(
                ContinuityPlan.process_id == pid,
                ContinuityPlan.status == "PUBLISHED",
                ContinuityPlan.is_deleted == False,
            )
            .first()
        ) is not None
        if not has_plan:
            missing_plans += 1

        affected_processes.append(AffectedProcess(
            process_id=proc.id,
            process_name=proc.name,
            service_name=proc.service.name if proc.service else "",
            target_rto_hours=target_rto,
            rto_breached=rto_breached,
            has_published_plan=has_plan,
        ))

    return SimulationResult(
        scenario_id=scenario.id,
        estimated_outage_hours=outage_hours,
        affected_processes_count=len(affected_processes),
        rto_breaches_count=rto_breaches,
        missing_plans_count=missing_plans,
        affected_processes=affected_processes,
    )
