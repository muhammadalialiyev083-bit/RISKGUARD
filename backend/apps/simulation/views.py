from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.simulation.models import Scenario, Exercise
from apps.simulation.serializers import ScenarioSerializer, ExerciseSerializer
from apps.simulation.simulator import ScenarioSimulator
from apps.authentication.permissions import IsTenantMember, IsAuditorReadOnly
from apps.core.audit import record_audit


class ScenarioViewSet(viewsets.ModelViewSet):
    """
    FR-10: Ssenariylar va simulyatsiya.
    """
    serializer_class = ScenarioSerializer
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Scenario.objects.all()
        return Scenario.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        sc = serializer.save(organization=self.request.user.organization)
        record_audit(
            request=self.request,
            action='CREATE',
            entity='Scenario',
            entity_id=sc.id,
            after_state={'title': sc.title, 'outage': str(sc.estimated_outage_hours)}
        )

    @action(detail=True, methods=['post'])
    def simulate(self, request, pk=None):
        """
        FR-10 va T-06: Nosozlik ssenariysini simulyatsiya qilish va zanjirsimon ta'sirni hisoblash.
        """
        scenario = self.get_object()
        result = ScenarioSimulator.simulate(scenario)

        record_audit(
            request=request,
            action='SIMULATE',
            entity='Scenario',
            entity_id=scenario.id,
            after_state={'affected_count': result['affected_processes_count']}
        )

        return Response(result, status=status.HTTP_200_OK)


class ExerciseViewSet(viewsets.ModelViewSet):
    """
    FR-13: Rejalashtirilgan mashqlar va real sinovlar.
    """
    serializer_class = ExerciseSerializer
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Exercise.objects.all()
        return Exercise.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        ex = serializer.save(organization=self.request.user.organization)
        record_audit(
            request=self.request,
            action='CREATE',
            entity='Exercise',
            entity_id=ex.id,
            after_state={'plan_id': ex.plan_id, 'outcome': ex.outcome}
        )
