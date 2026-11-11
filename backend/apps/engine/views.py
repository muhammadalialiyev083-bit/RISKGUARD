from rest_framework import views, status, permissions, serializers
from rest_framework.response import Response
from apps.engine.calculator import RiskCalculator, PriorityEngine, StrategyEvaluator
from apps.processes.models import BusinessProcess
from apps.authentication.permissions import IsTenantMember, IsAuditorReadOnly
from apps.core.audit import record_audit


class RiskInput(serializers.Serializer):
    likelihood = serializers.IntegerField(min_value=1, max_value=5, default=1)
    impact = serializers.IntegerField(min_value=1, max_value=5, default=1)
    rto_hours = serializers.FloatField(min_value=0, default=24)
    rpo_minutes = serializers.IntegerField(min_value=0, default=60)
    backup_interval_minutes = serializers.IntegerField(min_value=0, default=60)


class StrategyCandidate(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    name = serializers.CharField()
    estimated_rto_hours = serializers.FloatField(min_value=0)
    estimated_rpo_minutes = serializers.IntegerField(min_value=0)
    cost = serializers.FloatField(min_value=0, default=0)


class StrategyInput(serializers.Serializer):
    target_rto_hours = serializers.FloatField(min_value=0, default=24)
    target_rpo_minutes = serializers.IntegerField(min_value=0, default=60)
    strategies = StrategyCandidate(many=True, default=list)


class PriorityAnalysisView(views.APIView):
    """
    FR-07: Ustuvorlikni hisoblash (/api/v1/analyses/priority).
    Jarayon yoki butun tashkilot bo'yicha ustuvorlik ballarini hisoblaydi va saralaydi.
    """
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def post(self, request):
        process_id = request.data.get('process_id')
        user = request.user
        
        if process_id:
            if isinstance(process_id, bool) or not str(process_id).isdigit():
                raise serializers.ValidationError({'process_id': 'Jarayon ID sini kiriting.'})
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
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def post(self, request):
        serializer = RiskInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        likelihood = data['likelihood']
        impact = data['impact']
        rpo_minutes = data['rpo_minutes']
        backup_interval = data['backup_interval_minutes']

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
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def post(self, request):
        serializer = StrategyInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        target_rto = data['target_rto_hours']
        target_rpo = data['target_rpo_minutes']
        candidates = data['strategies']

        res = StrategyEvaluator.evaluate_strategies(target_rto, target_rpo, candidates)
        return Response(res, status=status.HTTP_200_OK)
