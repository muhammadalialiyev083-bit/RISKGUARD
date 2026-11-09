from rest_framework import permissions


class IsTenantMember(permissions.BasePermission):
    """
    NFR-01: Kirish nazorati va Multi-Tenant izolatsiyasi.
    Faqat tizimga kirgan va tashkilotga biriktirilgan foydalanuvchilarga ruxsat beradi.
    Begona tashkilot ma'lumotlariga kirishga urinish bloklanadi.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.organization or request.user.is_superuser))

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        
        # Obyektning organization atributi borligini tekshirish
        obj_org = getattr(obj, 'organization', None)
        if obj_org is not None:
            return obj_org == request.user.organization
        
        # Agar obyekt bevosita tashkilot bo'lsa
        if hasattr(obj, 'pk') and obj.__class__.__name__ == 'Organization':
            return obj == request.user.organization
            
        return False


class IsAuditorReadOnly(permissions.BasePermission):
    """
    Auditor roli faqat o'qish (GET, HEAD, OPTIONS) huquqiga ega.
    Hech qanday o'zgartirish kirita olmaydi.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == 'AUDITOR' and request.method not in permissions.SAFE_METHODS:
            return False
        return True


class IsAdminRole(permissions.BasePermission):
    """Faqat Administrator ruxsati."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.role == 'ADMIN' or request.user.is_superuser))


class IsBCMSManagerRole(permissions.BasePermission):
    """BCMS menejeri yoki Administrator."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.role in ['ADMIN', 'BCMS_MANAGER'] or request.user.is_superuser))


class IsRiskAnalystOrManager(permissions.BasePermission):
    """Risk tahlilchisi, BCMS menejeri yoki Administrator."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.role in ['ADMIN', 'BCMS_MANAGER', 'RISK_ANALYST'] or request.user.is_superuser))


class IsApproverRole(permissions.BasePermission):
    """Rahbariyat / Tasdiqlovchi yoki Administrator."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.role in ['ADMIN', 'APPROVER'] or request.user.is_superuser))
