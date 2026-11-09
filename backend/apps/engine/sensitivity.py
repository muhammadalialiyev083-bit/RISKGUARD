"""F1: Ilmiy mustahkamlash — sezgirlik, ablyatsiya, Kendall-tau.

Mavjud formulalar (calculator.py) o'zgartirilmaydi. Bu modul faqat
mavjud formula barqarorligini o'lchaydi: vaznlar, T_MAX va thresholdlar
o'zgarganda ranking qanchalik siljishini hisoblaydi.

Barcha funksiyalar sof (DB siz) va deterministik — stdlib only.
"""
from itertools import combinations
from typing import Dict, List, Any

OPERAND_KEYS = ('impact_norm', 'urgency_norm', 'risk_norm', 'dependency_norm')


def kendall_tau(rank_a: List[Any], rank_b: List[Any]) -> float:
    """Kendall tau-b (bog'lanishlarni hisobga olgan). Kirishlar — element ID larning tartibli ro'yxati.

    Ikkala ro'yxatda bir xil elementlar to'plami bo'lishi shart.
    Qaytaradi: [-1.0, 1.0]; 1.0 = bir xil tartib.
    """
    if len(rank_a) != len(rank_b):
        raise ValueError("Rank ro'yxatlari bir xil uzunlikda bo'lishi shart.")
    if set(rank_a) != set(rank_b):
        raise ValueError("Rank ro'yxatlarida bir xil elementlar bo'lishi shart.")
    n = len(rank_a)
    if n < 2:
        return 1.0
    pos_b = {v: i for i, v in enumerate(rank_b)}
    # rank_a tartibida rank_b pozitsiyalari ketma-ketligi
    seq = [pos_b[v] for v in rank_a]
    concordant = discordant = 0
    for i, j in combinations(range(n), 2):
        if seq[i] < seq[j]:
            concordant += 1
        elif seq[i] > seq[j]:
            discordant += 1
        # teng bo'lsa (bog'lanish) — tau-b da hisoblagichga kirmaydi
    denom = n * (n - 1) / 2
    if denom == 0:
        return 1.0
    return round((concordant - discordant) / denom, 4)


WEIGHT_KEYS = ('impact', 'urgency', 'risk', 'dependency')

WEIGHT_TO_OPERAND = {
    'impact': 'impact_norm',
    'urgency': 'urgency_norm',
    'risk': 'risk_norm',
    'dependency': 'dependency_norm',
}


def _score(operands: Dict[str, float], weights: Dict[str, float]) -> float:
    return round(sum(weights[k] * operands[WEIGHT_TO_OPERAND[k]] for k in WEIGHT_KEYS), 4)


def _rank(process_operands: List[Dict[str, Any]], weights: Dict[str, float]) -> List[Any]:
    scored = [(p['id'], _score(p['operands'], weights)) for p in process_operands]
    scored.sort(key=lambda x: (-x[1], x[0]))
    return [pid for pid, _ in scored]


def sweep_weights(
    process_operands: List[Dict[str, Any]],
    base_weights: Dict[str, float],
    delta: float = 0.05,
) -> Dict[str, Any]:
    """Har bir vaznni +-delta ga siljitib (qolganlarini proporsional renormalizatsiya),
    ranking barqarorligini o'lchash. Qaytaradi: base_rank, har vazn uchun min tau va max siljish.
    """
    base_rank = _rank(process_operands, base_weights)
    pos_base = {pid: i for i, pid in enumerate(base_rank)}
    per_weight = {}
    for key in WEIGHT_KEYS:
        taus = []
        max_disp = 0
        for sign in (+1, -1):
            w = dict(base_weights)
            w[key] = round(max(0.01, w[key] + sign * delta), 4)
            rest = [k for k in WEIGHT_KEYS if k != key]
            leftover = round(1.0 - w[key], 4)
            base_rest_sum = sum(base_weights[k] for k in rest)
            for k in rest:
                w[k] = round(leftover * base_weights[k] / base_rest_sum, 4) if base_rest_sum else round(leftover / len(rest), 4)
            new_rank = _rank(process_operands, w)
            taus.append(kendall_tau(base_rank, new_rank))
            pos_new = {pid: i for i, pid in enumerate(new_rank)}
            max_disp = max(max_disp, max(abs(pos_base[pid] - pos_new[pid]) for pid in base_rank)) if base_rank else 0
        per_weight[WEIGHT_TO_OPERAND[key]] = {'min_tau': min(taus), 'max_displacement': max_disp, 'weights_tested': 2}
    return {
        'base_rank': base_rank,
        'base_weights': dict(base_weights),
        'delta': delta,
        'per_weight': per_weight,
        'min_tau_overall': min(v['min_tau'] for v in per_weight.values()) if per_weight else 1.0,
    }


def ablate_operands(
    process_operands: List[Dict[str, Any]],
    base_weights: Dict[str, float],
) -> Dict[str, Any]:
    """Har bir operandni navbat bilan olib tashlash (vazn=0, qolganlar renormalizatsiya)
    va ranking o'zgarishini o'lchash."""
    base_rank = _rank(process_operands, base_weights)
    per_operand = {}
    for key in WEIGHT_KEYS:
        w = {k: (0.0 if k == key else base_weights[k]) for k in WEIGHT_KEYS}
        rest_sum = sum(w.values())
        if rest_sum:
            w = {k: round(v / rest_sum, 4) for k, v in w.items()}
        new_rank = _rank(process_operands, w)
        pos_new = {pid: i for i, pid in enumerate(new_rank)}
        pos_base = {pid: i for i, pid in enumerate(base_rank)}
        per_operand[WEIGHT_TO_OPERAND[key]] = {
            'tau_vs_base': kendall_tau(base_rank, new_rank),
            'max_displacement': max(abs(pos_base[pid] - pos_new[pid]) for pid in base_rank) if base_rank else 0,
            'new_rank': new_rank,
        }
    return {'base_rank': base_rank, 'per_operand': per_operand}


def sweep_tmax(
    rto_hours_list: List[float],
    tmax_values: List[float] = (48.0, 72.0, 96.0),
) -> Dict[str, Any]:
    """urgency = 1 - min(1, rto/T_MAX) formulasi uchun T_MAX sezgirligi.
    Har bir T_MAX da urgency vektorini qaytaradi (deterministik)."""
    out = {}
    for tmax in tmax_values:
        out[str(tmax)] = [round(max(0.0, 1.0 - min(1.0, r / tmax)), 4) for r in rto_hours_list]
    return {'rto_hours': list(rto_hours_list), 'tmax_values': list(tmax_values), 'urgency_vectors': out}


def sweep_thresholds(
    scores: List[int],
    low_values: List[int] = (5, 6, 7),
    med_values: List[int] = (13, 14, 15),
) -> Dict[str, Any]:
    """Risk klass thresholdlari (low/med) o'zgarganda klass taqsimoti qanday siljishi."""
    def classify(s, lo, me):
        if s <= lo:
            return 'low'
        if s <= me:
            return 'medium'
        return 'high'
    base = [classify(s, 6, 14) for s in scores]
    variants = {}
    for lo in low_values:
        for me in med_values:
            if lo >= me:
                continue
            labels = [classify(s, lo, me) for s in scores]
            changed = sum(1 for a, b in zip(base, labels) if a != b)
            variants[f"low={lo},med={me}"] = {'labels': labels, 'changed_vs_base': changed}
    return {'scores': list(scores), 'base_labels': base, 'variants': variants}
