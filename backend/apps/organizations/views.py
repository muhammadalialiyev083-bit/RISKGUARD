from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from apps.organizations.models import Organization, Department, Service
from apps.organizations.serializers import OrganizationSerializer, DepartmentSerializer, ServiceSerializer
from apps.authentication.permissions import IsTenantMember, IsAuditorReadOnly, IsAdminRole, IsBCMSManagerRole
from apps.core.audit import record_audit


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    FR-02: Tashkilot profili.
    Foydalanuvchi faqat o'z tashkilotini ko'ra oladi va Administrator o'zgartira oladi.
    """
    serializer_class = OrganizationSerializer
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Organization.objects.all()
        return Organization.objects.filter(id=user.organization_id)

    def perform_update(self, serializer):
        before = OrganizationSerializer(serializer.instance).data
        org = serializer.save()
        record_audit(
            request=self.request,
            action='UPDATE',
            entity='Organization',
            entity_id=org.id,
            before_state=before,
            after_state=OrganizationSerializer(org).data
        )


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    Tashkilot tarkibiy bo'linmalari va filiallari.
    """
    serializer_class = DepartmentSerializer
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Department.objects.all()
        return Department.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        dept = serializer.save(organization=self.request.user.organization)
        record_audit(
            request=self.request,
            action='CREATE',
            entity='Department',
            entity_id=dept.id,
            after_state=DepartmentSerializer(dept).data
        )

    def perform_update(self, serializer):
        before = DepartmentSerializer(serializer.instance).data
        dept = serializer.save()
        record_audit(
            request=self.request,
            action='UPDATE',
            entity='Department',
            entity_id=dept.id,
            before_state=before,
            after_state=DepartmentSerializer(dept).data
        )


class ServiceViewSet(viewsets.ModelViewSet):
    """
    Tashkilot taqdim etadigan xizmatlar (Services) reestri.
    """
    serializer_class = ServiceSerializer
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Service.objects.all()
        return Service.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        service = serializer.save(organization=self.request.user.organization)
        record_audit(
            request=self.request,
            action='CREATE',
            entity='Service',
            entity_id=service.id,
            after_state=ServiceSerializer(service).data
        )
