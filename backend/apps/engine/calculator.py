import networkx as nx
from decimal import Decimal
from typing import Dict, Any, List, Optional
from apps.processes.models import BusinessProcess, Asset, Dependency
from apps.bia.models import BIAAssessment, BIAImpact
from apps.risks.models import Risk
from apps.organizations.models import Organization


class RiskCalculator:
    """
    FR-07: Soddalashtirilgan risk indeksi va klassifikatsiyasi.
    RiskScore = Likelihood * Impact (1..25).
    """
    @staticmethod
    def calculate_score(likelihood: int, impact: int) -> int:
        return likelihood * impact

    @staticmethod
    def classify_risk(score: int, low_thresh: int = 6, med_thresh: int = 14) -> str:
        if score <= low_thresh:
            return 'low'
        elif score <= med_thresh:
            return 'medium'
        return 'high'

    @staticmethod
    def normalize_risk(score: int) -> float:
        """Ordinal [1, 25] shkalani [0.0, 1.0] oraliqqa normallashtirish."""
        clamped = max(1, min(25, score))
        return float((clamped - 1) / 24.0)


class BIAEvaluator:
    """
    FR-07: BIA zararlarini normallashtirish va kompozit Impact_norm hisoblash.
    Vaznlar: Fin: 0.35, Op: 0.25, Legal: 0.20, Reput: 0.20.
    """
    DEFAULT_WEIGHTS = {
        'financial': 0.35,
        'operational': 0.25,
        'legal': 0.20,
        'reputational': 0.20
    }

    @classmethod
    def evaluate_impact_norm(cls, bia: BIAAssessment, max_acceptable_loss: Decimal = Decimal('500000000.00'), weights: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        w = weights or cls.DEFAULT_WEIGHTS
        impacts = bia.impacts.all().order_by('-horizon_hours')
        
        if not impacts.exists():
            return {
                'impact_norm': 0.0,
                'financial_norm': 0.0,
                'operational_norm': 0.0,
                'legal_norm': 0.0,
                'reputational_norm': 0.0,
                'horizon_used': 0.0
            }

        # Eng yuqori gorizontdagi ta'sirlarni olish (odatda MTPD ga eng yaqin nuqta)
        worst = impacts.first()
        fin_loss = Decimal(str(worst.financial_loss))
        max_loss = Decimal(str(max_acceptable_loss)) if max_acceptable_loss > 0 else Decimal('1.0')

        fin_norm = min(1.0, float(fin_loss / max_loss))
        op_norm = float((worst.operational_score - 1) / 4.0)
        legal_norm = float((worst.legal_score - 1) / 4.0)
        reput_norm = float((worst.reputational_score - 1) / 4.0)

        composite = (
            w['financial'] * fin_norm +
            w['operational'] * op_norm +
            w['legal'] * legal_norm +
            w['reputational'] * reput_norm
        )

        return {
            'impact_norm': round(composite, 4),
            'financial_norm': round(fin_norm, 4),
            'operational_norm': round(op_norm, 4),
            'legal_norm': round(legal_norm, 4),
            'reputational_norm': round(reput_norm, 4),
            'horizon_used': float(worst.horizon_hours)
        }


class DependencyAnalyzer:
    """
    FR-04 va FR-07: Resurs bog'liqliklari grafigi G=(V,E) tahlili.
    Edge konvensiyasi: from -> to "from ushbu to ga bog'langan (depends-on)".
    Masalan PROCESS:1 -> ASSET:2 = "1-jarayon 2-aktivga bog'langan".
    Shuning uchun nx.ancestors(g, X) = X ga (bevosita/bilvosita) bog'langan tugunlar.
    NetworkX orqali jarayonga bog'liq quyi tarmoqlar va aktivlarni hisoblash.
    """
    @staticmethod
    def build_graph(organization: Organization) -> nx.DiGraph:
        g = nx.DiGraph()
        deps = Dependency.objects.filter(organization=organization)
        for d in deps:
            u = f"{d.from_type}:{d.from_id}"
            v = f"{d.to_type}:{d.to_id}"
            g.add_edge(u, v, criticality=d.dependency_criticality)
        return g

    @classmethod
    def calculate_dependency_norm(cls, organization: Organization, process_id: int) -> float:
        g = cls.build_graph(organization)
        proc_node = f"PROCESS:{process_id}"
        
        total_procs = BusinessProcess.objects.filter(organization=organization).count()
        if total_procs <= 1:
            return 0.0

        # Ushbu jarayonga qaram bo'lgan tugunlar (ancestors: X ga yo'l bor tugunlar,
        # ya'ni X ga bog'langanlar — edge konvensiyasi "from depends-on to")
        if proc_node in g:
            in_dependents = nx.ancestors(g, proc_node)
            count = len([node for node in in_dependents if node.startswith('PROCESS:')])
            return round(min(1.0, count / (total_procs - 1)), 4)
        return 0.0


class PriorityEngine:
    """
    FR-07: Ustuvorlik indeksi (Research Hypothesis Formula):
    Priority = 0.40 * Impact_norm + 0.25 * Urgency_norm + 0.20 * Risk_norm + 0.15 * Dependency_norm
    """
    WEIGHTS = {
        'impact': 0.40,
        'urgency': 0.25,
        'risk': 0.20,
        'dependency': 0.15
    }

    T_MAX_HOURS = 72.0  # Standart rejalashtirish gorizonti

    @classmethod
    def calculate_priority(cls, process: BusinessProcess) -> Dict[str, Any]:
        org = process.organization
        
        # 1. BIA Impact Norm
        latest_bia = process.bia_assessments.order_by('-revision').first()
        if latest_bia:
            bia_res = BIAEvaluator.evaluate_impact_norm(latest_bia, org.max_acceptable_loss)
            impact_norm = bia_res['impact_norm']
            rto_h = float(latest_bia.rto_hours)
            mtpd_h = float(latest_bia.mtpd_hours)
            has_rpo_gap = latest_bia.has_rpo_gap
        else:
            impact_norm = 0.5 if process.criticality in ['CRITICAL', 'HIGH'] else 0.2
            rto_h = 24.0
            mtpd_h = 48.0
            has_rpo_gap = False

        # 2. Urgency Norm (RTO qisqa bo'lsa shoshilinchlik yuqori)
        urgency_norm = max(0.0, 1.0 - min(1.0, rto_h / cls.T_MAX_HOURS))

        # 3. Risk Norm
        risks = process.risks.all()
        if risks.exists():
            max_risk_score = max(r.risk_score for r in risks)
            risk_norm = RiskCalculator.normalize_risk(max_risk_score)
        else:
            risk_norm = 0.1

        # 4. Dependency Norm
        dep_norm = DependencyAnalyzer.calculate_dependency_norm(org, process.id)

        # 5. Composite Priority Score
        priority_score = (
            cls.WEIGHTS['impact'] * impact_norm +
            cls.WEIGHTS['urgency'] * urgency_norm +
            cls.WEIGHTS['risk'] * risk_norm +
            cls.WEIGHTS['dependency'] * dep_norm
        )

        return {
            'process_id': process.id,
            'process_name': process.name,
            'priority_score': round(priority_score, 4),
            'operands': {
                'impact_norm': round(impact_norm, 4),
                'urgency_norm': round(urgency_norm, 4),
                'risk_norm': round(risk_norm, 4),
                'dependency_norm': round(dep_norm, 4)
            },
            'weights': cls.WEIGHTS,
            'parameters': {
                'rto_hours': rto_h,
                'mtpd_hours': mtpd_h,
                'has_rpo_gap': has_rpo_gap
            },
            'formula_version': '1.0 (ISO 22301/TS 22317 hypothesis)'
        }


class StrategyEvaluator:
    """
    FR-08: Tiklash strategiyasini tanlash algoritmi (Hujjat 7.2.F).
    RTO_est <= RTO_target va RPO_est <= RPO_target shartlarini qanoatlantiradigan eng kam xarajatli yechim.
    """
    @staticmethod
    def evaluate_strategies(target_rto_hours: float, target_rpo_minutes: int, candidate_strategies: List[Dict[str, Any]]) -> Dict[str, Any]:
        valid_candidates = []
        observations = []

        for strat in candidate_strategies:
            est_rto = float(strat.get('estimated_rto_hours', 999))
            est_rpo = int(strat.get('estimated_rpo_minutes', 9999))
            cost = float(strat.get('cost', 0))

            rto_ok = est_rto <= target_rto_hours
            rpo_ok = est_rpo <= target_rpo_minutes

            if rto_ok and rpo_ok:
                valid_candidates.append({**strat, 'cost_val': cost})
            else:
                reason = []
                if not rto_ok:
                    reason.append(f"RTO oshib ketdi ({est_rto}h > {target_rto_hours}h)")
                if not rpo_ok:
                    reason.append(f"RPO oshib ketdi ({est_rpo}m > {target_rpo_minutes}m)")
                observations.append(f"Variant '{strat.get('name')}': {', '.join(reason)}")

        if not valid_candidates:
            return {
                'recommended_strategy': None,
                'status': 'NO_FEASIBLE_OPTION',
                'message': 'Mos variant yo\'q. Barcha strategiyalar RTO yoki RPO talablarini buzadi.',
                'observations': observations
            }

        # Eng arzon variantni tanlash
        recommended = min(valid_candidates, key=lambda x: x['cost_val'])
        return {
            'recommended_strategy': recommended,
            'status': 'OPTIMAL_FOUND',
            'message': f"Optimal strategiya tanlandi: {recommended.get('name')}",
            'observations': observations
        }
