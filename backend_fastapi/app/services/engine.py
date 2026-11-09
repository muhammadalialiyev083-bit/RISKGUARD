"""FR-07, FR-08: Calculation engine — priority, risk, strategy algorithms.

Domain invariants preserved exactly:
- risk_score = likelihood × impact (1–25)
- thresholds: ≤6 low, 7–14 medium, ≥15 high  
- priority = 0.40·Impact + 0.25·Urgency + 0.20·Risk + 0.15·Dependency
- RPO gap: backup_interval > rpo_minutes
"""

from typing import List
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.process import BusinessProcess, Dependency
from app.models.bia import BIAAssessment
from app.models.risk import Risk
from app.schemas.engine import (
    EvaluateRiskRequest, EvaluateRiskResponse,
    EvaluateStrategyRequest, PriorityResponse,
    RankedProcess, PriorityOperands,
)


def evaluate_risk_algorithm(data: EvaluateRiskRequest) -> EvaluateRiskResponse:
    """10.1 algorithm: compute risk score, class, RPO gap, observations."""
    risk_score = data.likelihood * data.impact
    if risk_score <= 6:
        risk_class = "low"
    elif risk_score <= 14:
        risk_class = "medium"
    else:
        risk_class = "high"

    rpo_gap = data.backup_interval_minutes > data.rpo_minutes

    observations: List[str] = []
    if risk_class == "high":
        observations.append(f"Yuqori risk darajasi aniqlandi (ball: {risk_score}). Zudlik bilan nazorat chorasi talab qilinadi.")
    if rpo_gap:
        observations.append(
            f"RPO bo'shliq mavjud: Zaxiralash oralig'i ({data.backup_interval_minutes} daqiqa) "
            f"ruxsat etilgan RPO dan ({data.rpo_minutes} daqiqa) katta."
        )
    if data.rto_hours > 24:
        observations.append(f"RTO juda uzoq ({data.rto_hours} soat). Tezkor tiklash strategiyasini ko'rib chiqing.")
    if risk_score >= 15 and not rpo_gap:
        observations.append("Risk yuqori, lekin RPO qoniqarli. Ehtimollik yoki ta'sir kamaytirilishi kerak.")
    if not observations:
        observations.append("Barcha ko'rsatkichlar qoniqarli darajada.")

    return EvaluateRiskResponse(
        risk_score=risk_score,
        risk_class=risk_class,
        rpo_gap=rpo_gap,
        observations=observations,
    )


def compute_priority_scores(db: Session, organization_id: int) -> PriorityResponse:
    """Compute priority = 0.40*Impact + 0.25*Urgency + 0.20*Risk + 0.15*Dependency."""
    processes = (
        db.query(BusinessProcess)
        .filter(
            BusinessProcess.organization_id == organization_id,
            BusinessProcess.is_deleted == False,
        )
        .all()
    )
    if not processes:
        return PriorityResponse(ranked_processes=[])

    # Gather raw data for normalization
    crit_map = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
    raw_data = []
    for proc in processes:
        # Impact: from criticality
        impact_raw = crit_map.get(proc.criticality, 1)

        # Urgency: inverse of best RTO (lower RTO = higher urgency)
        best_bia = (
            db.query(BIAAssessment)
            .filter(BIAAssessment.process_id == proc.id, BIAAssessment.is_deleted == False)
            .order_by(BIAAssessment.rto_hours)
            .first()
        )
        rto_val = float(best_bia.rto_hours) if best_bia else 24.0
        urgency_raw = max(0.01, 1.0 / max(rto_val, 0.01))

        # Risk: max risk score for this process
        max_risk = (
            db.query(Risk)
            .filter(Risk.process_id == proc.id, Risk.is_deleted == False)
            .all()
        )
        risk_raw = max((r.risk_score for r in max_risk), default=0)

        # Dependency: count of mandatory dependencies
        dep_count = (
            db.query(Dependency)
            .filter(
                Dependency.organization_id == organization_id,
                Dependency.from_type == "PROCESS",
                Dependency.from_id == proc.id,
                Dependency.dependency_criticality == "MANDATORY",
                Dependency.is_deleted == False,
            )
            .count()
        )

        raw_data.append({
            "process": proc,
            "impact_raw": impact_raw,
            "urgency_raw": urgency_raw,
            "risk_raw": risk_raw,
            "dep_raw": dep_count,
        })

    # Normalize each dimension to [0, 1]
    def normalize(values):
        vmin, vmax = min(values), max(values)
        rng = vmax - vmin
        if rng == 0:
            return [0.5] * len(values)
        return [(v - vmin) / rng for v in values]

    impact_vals = normalize([d["impact_raw"] for d in raw_data])
    urgency_vals = normalize([d["urgency_raw"] for d in raw_data])
    risk_vals = normalize([d["risk_raw"] for d in raw_data])
    dep_vals = normalize([d["dep_raw"] for d in raw_data])

    ranked = []
    for i, d in enumerate(raw_data):
        score = (
            0.40 * impact_vals[i]
            + 0.25 * urgency_vals[i]
            + 0.20 * risk_vals[i]
            + 0.15 * dep_vals[i]
        )
        ranked.append(RankedProcess(
            process_id=d["process"].id,
            process_name=d["process"].name,
            priority_score=round(score, 4),
            operands=PriorityOperands(
                impact_norm=round(impact_vals[i], 4),
                urgency_norm=round(urgency_vals[i], 4),
                risk_norm=round(risk_vals[i], 4),
                dependency_norm=round(dep_vals[i], 4),
            ),
        ))

    ranked.sort(key=lambda x: x.priority_score, reverse=True)
    return PriorityResponse(ranked_processes=ranked)


def evaluate_strategy_algorithm(db: Session, data: EvaluateStrategyRequest, organization_id: int) -> dict:
    """Evaluate strategy effectiveness."""
    from app.models.plan import Strategy
    strategies = (
        db.query(Strategy)
        .filter(
            Strategy.process_id == data.process_id,
            Strategy.organization_id == organization_id,
            Strategy.is_deleted == False,
        )
        .all()
    )
    result = []
    for s in strategies:
        result.append({
            "strategy_id": s.id,
            "name": s.name,
            "estimated_rto_hours": float(s.estimated_rto_hours),
            "estimated_rpo_minutes": s.estimated_rpo_minutes,
            "estimated_cost": float(s.estimated_cost),
            "is_selected": s.is_selected,
        })
    return {"process_id": data.process_id, "strategies": result}
