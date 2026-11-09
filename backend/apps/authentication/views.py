from rest_framework import views, viewsets, status, permissions
from rest_framework.response import Response
from django.contrib.auth import login, logout
from apps.authentication.models import User
from apps.authentication.serializers import UserSerializer, UserCreateUpdateSerializer, LoginSerializer
from apps.authentication.permissions import IsTenantMember, IsAdminRole, IsAuditorReadOnly
from apps.core.audit import record_audit


class LoginView(views.APIView):
    """
    FR-01: Kirish (Login).
    Parolni tekshiradi, sessiya ochadi va audit jurnaliga yozadi.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)

        # Audit yozish
        record_audit(
            request=request,
            action='LOGIN',
            entity='User',
            entity_id=user.id,
            actor=user,
            organization=user.organization,
            after_state={'username': user.username, 'role': user.role}
        )

        user_data = UserSerializer(user).data
        return Response({
            'message': 'Muvaffaqiyatli kirildi.',
            'user': user_data
        }, status=status.HTTP_200_OK)


class LogoutView(views.APIView):
    """
    FR-01: Tizimdan chiqish (Logout).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        record_audit(
            request=request,
            action='LOGOUT',
            entity='User',
            entity_id=user.id,
            actor=user,
            organization=user.organization
        )
        logout(request)
        return Response({'message': 'Tizimdan muvaffaqiyatli chiqildi.'}, status=status.HTTP_200_OK)


class MeView(views.APIView):
    """
    Joriy foydalanuvchi profilini va rollarini qaytaradi.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UserViewSet(viewsets.ModelViewSet):
    """
    FR-01 va FR-02: Tashkilot doirasida foydalanuvchilarni boshqarish.
    Faqat Administrator foydalanuvchi qo'sha/o'zgartira oladi.
    Auditor faqat ko'ra oladi.
    """
    permission_classes = [IsTenantMember, IsAuditorReadOnly]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return User.objects.all()
        return User.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        user = serializer.save(organization=self.request.user.organization)
        record_audit(
            request=self.request,
            action='CREATE',
            entity='User',
            entity_id=user.id,
            after_state=UserSerializer(user).data
        )

    def perform_update(self, serializer):
        before_state = UserSerializer(serializer.instance).data
        user = serializer.save()
        record_audit(
            request=self.request,
            action='UPDATE',
            entity='User',
            entity_id=user.id,
            before_state=before_state,
            after_state=UserSerializer(user).data
        )

    def perform_destroy(self, instance):
        before_state = UserSerializer(instance).data
        record_audit(
            request=self.request,
            action='DELETE',
            entity='User',
            entity_id=instance.id,
            before_state=before_state
        )
        instance.delete()
