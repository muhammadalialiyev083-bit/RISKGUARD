from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from apps.processes.models import BusinessProcess, Asset, Dependency
from apps.processes.serializers import BusinessProcessSerializer, AssetSerializer, DependencySerializer
from apps.authentication.permissions import IsTenantMember, IsAuditorReadOnly, IsBCMSManagerRole
from apps.core.audit import record_audit


class BusinessProcessViewSet(viewsets.ModelViewSet):
    """
    FR-03: Biznes jarayonlar reestri.
    """
    serializer_class = BusinessProcessSerializer
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return BusinessProcess.objects.all()
        return BusinessProcess.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        proc = serializer.save(organization=self.request.user.organization)
        record_audit(
            request=self.request,
            action='CREATE',
            entity='BusinessProcess',
            entity_id=proc.id,
            after_state=BusinessProcessSerializer(proc).data
        )

    def perform_update(self, serializer):
        before = BusinessProcessSerializer(serializer.instance).data
        proc = serializer.save()
        record_audit(
            request=self.request,
            action='UPDATE',
            entity='BusinessProcess',
            entity_id=proc.id,
            before_state=before,
            after_state=BusinessProcessSerializer(proc).data
        )


class AssetViewSet(viewsets.ModelViewSet):
    """
    FR-04: Aktivlar va resurslar.
    """
    serializer_class = AssetSerializer
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Asset.objects.all()
        return Asset.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        asset = serializer.save(organization=self.request.user.organization)
        record_audit(
            request=self.request,
            action='CREATE',
            entity='Asset',
            entity_id=asset.id,
            after_state=AssetSerializer(asset).data
        )


class DependencyViewSet(viewsets.ModelViewSet):
    """
    FR-04: Bog'liqliklar grafigi.
    """
    serializer_class = DependencySerializer
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Dependency.objects.all()
        return Dependency.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        dep = serializer.save(organization=self.request.user.organization)
        record_audit(
            request=self.request,
            action='CREATE',
            entity='Dependency',
            entity_id=dep.id,
            after_state=DependencySerializer(dep).data
        )
