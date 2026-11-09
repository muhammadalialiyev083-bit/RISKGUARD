from rest_framework import views, status, permissions
from rest_framework.response import Response
from apps.engine.calculator import RiskCalculator, PriorityEngine, StrategyEvaluator
from apps.processes.models import BusinessProcess
from apps.authentication.permissions import IsTenantMember, IsAuditorReadOnly
from apps.core.audit import record_audit


class PriorityAnalysisView(views.APIView):
    """
    FR-07: Ustuvorlikni hisoblash (/api/v1/analyses/priority).
    Jarayon yoki butun tashkilot bo'yicha ustuvorlik ballarini hisoblaydi va saralaydi.
    """
    permission_classes = [IsTenantMember]

    def post(self, request):
        process_id = request.data.get('process_id')
        user = request.user
        
        if process_id:
            try:
                proc = BusinessProcess.objects.get(id=process_id, organization=user.organization)
            except BusinessProcess.DoesNotExist:
                return Response({'error': 'Jarayon topilmadi.'}, status=status.HTTP_404_NOT_FOUND)
            
            result = PriorityEngine.calculate_priority(proc)
            return Response(result, status=status.HTTP_200_OK)

        # Butun tashkilot bo'yicha hisoblash
        procs = BusinessProcess.objects.filter(organization=user.organization)
        results = [PriorityEngine.calculate_priority(p) for p in procs]
        results.sort(key=lambda x: x['priority_score'], reverse=True)

        return Response({
            'total_processes': len(results),
            'ranked_processes': results
        }, status=status.HTTP_200_OK)


class EvaluateRiskAlgorithmView(views.APIView):
    """
    FR-07 va Hujjat 10.1 namunaviy API:
    So'rov: {"process_id": 12, "likelihood": 4, "impact": 5, "rto_hours": 4, "rpo_minutes": 60, "backup_interval_minutes": 360}
    Javob: {"risk_score": 20, "risk_class": "high", "rpo_gap": true, "observations": ["Zaxiralash intervali RPO talabidan katta"]}
    """
    permission_classes = [IsTenantMember]

    def post(self, request):
        likelihood = int(request.data.get('likelihood', 1))
        impact = int(request.data.get('impact', 1))
        rto_hours = float(request.data.get('rto_hours', 24))
        rpo_minutes = int(request.data.get('rpo_minutes', 60))
        backup_interval = int(request.data.get('backup_interval_minutes', 60))

        score = RiskCalculator.calculate_score(likelihood, impact)
        org = request.user.organization
        low_t = org.risk_low_threshold if org else 6
        med_t = org.risk_medium_threshold if org else 14
        risk_class = RiskCalculator.classify_risk(score, low_t, med_t)

        rpo_gap = backup_interval > rpo_minutes
        observations = []
        if rpo_gap:
            observations.append("Zaxiralash intervali RPO talabidan katta")

        return Response({
            'risk_score': score,
            'risk_class': risk_class,
            'rpo_gap': rpo_gap,
            'observations': observations
        }, status=status.HTTP_200_OK)


class EvaluateStrategyView(views.APIView):
    """
    FR-08: Tiklash strategiyasini baholash va optimalini tanlash.
    """
    permission_classes = [IsTenantMember]

    def post(self, request):
        target_rto = float(request.data.get('target_rto_hours', 24))
        target_rpo = int(request.data.get('target_rpo_minutes', 60))
        candidates = request.data.get('strategies', [])

        res = StrategyEvaluator.evaluate_strategies(target_rto, target_rpo, candidates)
        return Response(res, status=status.HTTP_200_OK)
