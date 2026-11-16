import secrets
import time

from django.conf import settings
from django.contrib.auth import login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.exceptions import ValidationError
from django.db import transaction, IntegrityError
from django.http import HttpResponseRedirect
from django.middleware.csrf import get_token
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework import permissions, serializers, views
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response

from apps.core.audit import record_audit
from .models import GoogleIdentity, User
from .serializers import UserSerializer
from .security import (rate_limit, email_enabled, google_enabled, frontend_link,
                       send_security_email, google_client)


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'preferences']

    def validate_preferences(self, value):
        if not isinstance(value, dict) or set(value) - {'theme', 'notifications'}:
            raise serializers.ValidationError('Noto‘g‘ri afzalliklar.')
        if value.get('theme', 'dark') not in ('dark', 'light', 'system'):
            raise serializers.ValidationError('Tema dark, light yoki system bo‘lishi kerak.')
        if 'notifications' in value and not isinstance(value['notifications'], bool):
            raise serializers.ValidationError('Bildirishnoma qiymati boolean bo‘lishi kerak.')
        return value


class StrictCharField(serializers.CharField):
    """Passwords and bearer values must be strings, never coerced JSON values."""
    def to_internal_value(self, data):
        if not isinstance(data, str):
            self.fail('invalid')
        return super().to_internal_value(data)


class NewPasswordSerializer(serializers.Serializer):
    new_password = StrictCharField(write_only=True, trim_whitespace=False)
    confirm_password = StrictCharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Parollar mos kelmadi.'})
        try:
            validate_password(attrs['new_password'], self.context.get('user'))
        except ValidationError as exc:
            raise serializers.ValidationError({'new_password': exc.messages})
        return attrs


class ResetTokenSerializer(serializers.Serializer):
    uid = StrictCharField(max_length=128)
    token = StrictCharField(max_length=2048)


class PasswordChangeSerializer(NewPasswordSerializer):
    current_password = StrictCharField(write_only=True, trim_whitespace=False)


class PasswordConfirmationSerializer(serializers.Serializer):
    password = StrictCharField(write_only=True, trim_whitespace=False)


class ResetEmailSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class InvitationSerializer(ResetEmailSerializer):
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, default=User.ROLE_PROCESS_OWNER)
    first_name = StrictCharField(max_length=150, allow_blank=True, default='')
    last_name = StrictCharField(max_length=150, allow_blank=True, default='')


class InvitationTokenSerializer(ResetTokenSerializer):
    username = StrictCharField(max_length=150, validators=User._meta.get_field('username').validators)


@method_decorator(never_cache, name='dispatch')
class AuthConfigView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'google_enabled': google_enabled(), 'password_reset_enabled': email_enabled()})


@method_decorator(never_cache, name='dispatch')
class PasswordChangeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        rate_limit(request, 'password-change', 10, 900, str(request.user.pk))
        serializer = PasswordChangeSerializer(data=request.data, context={'user': request.user})
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data['current_password']):
            return Response({'detail': 'Joriy parol noto‘g‘ri.'}, status=400)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        record_audit(request=request, action='UPDATE', entity='AccountSecurity', entity_id=request.user.pk,
                     after_state={'password_changed': True})
        # Do not retain this session: every old session hash must become unusable.
        logout(request)
        return Response({'message': 'Parol yangilandi. Qayta kiring.', 'csrfToken': get_token(request)})


@method_decorator(never_cache, name='dispatch')
class PasswordResetView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        SessionAuthentication().enforce_csrf(request)
        serializer = ResetEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        rate_limit(request, 'password-reset', 5, 3600, email)
        if not email_enabled():
            return Response({'detail': 'Hisobni tiklash xizmati hali sozlanmagan. Administratorga murojaat qiling.'}, status=503)
        # Always the same public response, including unknown/inactive/duplicate emails.
        users = User.objects.filter(email__iexact=email, is_active=True)
        if users.count() == 1:
            user = users.first()
            if user.has_usable_password():
                link = frontend_link('/auth/reset', fragment=True, uid=urlsafe_base64_encode(force_bytes(user.pk)),
                                     token=default_token_generator.make_token(user))
                send_security_email(email, 'UzHi — parolni tiklash',
                                    'Parolni yangilash uchun havolani oching:\n' + link +
                                    '\nAgar buni siz so‘ramagan bo‘lsangiz, xabarni e’tiborsiz qoldiring.')
        return Response({'message': 'Hisob mavjud bo‘lsa, tiklash havolasi yuboriladi.'})


@method_decorator(never_cache, name='dispatch')
class PasswordResetConfirmView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        SessionAuthentication().enforce_csrf(request)
        rate_limit(request, 'password-reset-confirm', 20, 900)
        # Validate token field types before decoding, including malformed JSON inputs.
        token_fields = ResetTokenSerializer(data=request.data)
        token_fields.is_valid(raise_exception=True)
        try:
            uid = force_str(urlsafe_base64_decode(token_fields.validated_data['uid']))
            with transaction.atomic():
                user = User.objects.select_for_update().get(pk=uid, is_active=True)
                if not default_token_generator.check_token(user, token_fields.validated_data['token']):
                    raise ValueError()
                serializer = NewPasswordSerializer(data=request.data, context={'user': user})
                serializer.is_valid(raise_exception=True)
                user.set_password(serializer.validated_data['new_password'])
                user.save(update_fields=['password'])
                record_audit(request=request, actor=user, organization=user.organization, action='UPDATE',
                             entity='AccountSecurity', entity_id=user.pk, after_state={'password_reset': True})
        except (ValueError, TypeError, OverflowError, User.DoesNotExist):
            return Response({'detail': 'Havola eskirgan, ishlatilgan yoki noto‘g‘ri.'}, status=400)
        logout(request)
        return Response({'message': 'Parol yangilandi. Tizimga qayta kiring.', 'csrfToken': get_token(request)})


def invite_user(request):
    serializer = InvitationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    email, role = data['email'], data['role']
    if not email_enabled():
        return Response({'detail': 'Email xizmati sozlanmagan.'}, status=503)
    if User.objects.filter(email__iexact=email).exists():
        return Response({'detail': 'Ushbu email uchun hisob mavjud. Administrator tekshiruvi kerak.'}, status=400)
    with transaction.atomic():
        user = User.objects.create(username='invite-' + secrets.token_hex(12), email=email,
                                   role=role, organization=request.user.organization, is_active=False,
                                   first_name=data['first_name'], last_name=data['last_name'])
        user.set_unusable_password()
        user.save(update_fields=['password'])
        token = signing.dumps({'user': user.pk}, salt='uzhi-invitation')
        link = frontend_link('/auth/invitation', fragment=True, uid=urlsafe_base64_encode(force_bytes(user.pk)), token=token)
        if not send_security_email(email, 'UzHi — tashkilotga taklif', 'Taklifni qabul qilish:\n' + link):
            transaction.set_rollback(True)
            return Response({'detail': 'Taklif emaili yuborilmadi. Qayta urinib ko‘ring.'}, status=503)
        record_audit(request=request, action='CREATE', entity='Invitation', entity_id=user.pk,
                     after_state={'role': role})
    return Response(UserSerializer(user).data, status=201)


@method_decorator(never_cache, name='dispatch')
class InvitationAcceptView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        SessionAuthentication().enforce_csrf(request)
        rate_limit(request, 'invitation-accept', 20, 900)
        token_fields = InvitationTokenSerializer(data=request.data)
        token_fields.is_valid(raise_exception=True)
        data = token_fields.validated_data
        try:
            uid = force_str(urlsafe_base64_decode(data['uid']))
            payload = signing.loads(data['token'], salt='uzhi-invitation', max_age=86400 * 3)
            with transaction.atomic():
                user = User.objects.select_for_update().get(pk=uid, is_active=False)
                if not isinstance(payload, dict) or payload.get('user') != user.pk or user.has_usable_password():
                    raise ValueError()
                username = data['username']
                if User.objects.exclude(pk=user.pk).filter(username=username).exists():
                    raise ValueError()
                user.username = username
                serializer = NewPasswordSerializer(data=request.data, context={'user': user})
                serializer.is_valid(raise_exception=True)
                user.username, user.is_active = username, True
                user.set_password(serializer.validated_data['new_password'])
                user.save(update_fields=['username', 'password', 'is_active'])
                record_audit(request=request, actor=user, organization=user.organization,
                             action='UPDATE', entity='Invitation', entity_id=user.pk, after_state={'accepted': True})
        except (ValueError, TypeError, OverflowError, signing.BadSignature, User.DoesNotExist, IntegrityError, ValidationError):
            return Response({'detail': 'Taklif eskirgan, ishlatilgan yoki login band.'}, status=400)
        return Response({'message': 'Hisob faollashtirildi. Endi tizimga kiring.'})


def begin_google(request, linking=False):
    if not google_enabled():
        return Response({'detail': 'Google orqali kirish hali sozlanmagan.'}, status=503)
    request.session['uzhi_google_flow'] = {'started': time.time(), 'link_user': request.user.pk if linking else None}
    try:
        return google_client().authorize_redirect(request, settings.GOOGLE_REDIRECT_URI, nonce=secrets.token_urlsafe(32))
    except Exception:
        request.session.pop('uzhi_google_flow', None)
        return Response({'detail': 'Google xizmati bilan bog‘lanib bo‘lmadi. Keyinroq qayta urinib ko‘ring.'}, status=503)


@method_decorator(never_cache, name='dispatch')
class GoogleStartView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        rate_limit(request, 'google-start', 20, 900)
        return begin_google(request)


@method_decorator(never_cache, name='dispatch')
class GoogleLinkView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        rate_limit(request, 'google-link', 10, 900, str(request.user.pk))
        serializer = PasswordConfirmationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data['password']):
            return Response({'detail': 'Hisobni bog‘lash uchun joriy parolni tasdiqlang.'}, status=400)
        response = begin_google(request, linking=True)
        # JSON redirect supports CSRF-protected fetch; client then navigates explicitly.
        if hasattr(response, 'url'):
            return Response({'authorization_url': response.url})
        return response


@method_decorator(never_cache, name='dispatch')
class GoogleCallbackView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        flow = request.session.pop('uzhi_google_flow', None)
        if not google_enabled() or not flow or time.time() - flow.get('started', 0) > 600:
            return HttpResponseRedirect(frontend_link('/auth/google/result', status='invalid_callback'))
        if request.query_params.get('error'):
            return HttpResponseRedirect(frontend_link('/auth/google/result', status='cancelled'))
        try:
            # Authlib validates stored state, PKCE, signature, iss/aud/exp and nonce.
            token = google_client().authorize_access_token(request)
            identity = token.get('userinfo')
            if not token.get('id_token') or not identity or not identity.get('sub') or identity.get('email_verified') is not True:
                raise ValueError()
            if flow.get('link_user'):
                if not request.user.is_authenticated or request.user.pk != flow['link_user']:
                    raise ValueError()
                with transaction.atomic():
                    if GoogleIdentity.objects.filter(user=request.user).exists():
                        raise ValueError()
                    GoogleIdentity.objects.create(user=request.user, subject=identity['sub'])
                    record_audit(request=request, action='UPDATE', entity='AccountSecurity', entity_id=request.user.pk,
                                 after_state={'google_linked': True})
                result = 'linked'
            else:
                link = GoogleIdentity.objects.select_related('user').filter(subject=identity['sub']).first()
                if not link or not link.user.is_active or not link.user.organization_id:
                    return HttpResponseRedirect(frontend_link('/auth/google/result', status='approval_required'))
                login(request, link.user, backend='django.contrib.auth.backends.ModelBackend')
                record_audit(request=request, action='LOGIN', entity='User', entity_id=link.user.pk,
                             after_state={'provider': 'google'})
                result = 'success'
        except Exception:
            # Provider errors may contain authorization codes; do not copy them to logs or URLs.
            result = 'invalid_callback'
        return HttpResponseRedirect(frontend_link('/auth/google/result', status=result))
