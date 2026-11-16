from django.urls import path
from .security_views import (AuthConfigView, PasswordChangeView, PasswordResetView, PasswordResetConfirmView,
                             GoogleStartView, GoogleLinkView, GoogleCallbackView, InvitationAcceptView)

urlpatterns = [
    path('config', AuthConfigView.as_view(), name='auth-config'),
    path('password/change', PasswordChangeView.as_view(), name='auth-password-change'),
    path('password/reset', PasswordResetView.as_view(), name='auth-password-reset'),
    path('password/reset/confirm', PasswordResetConfirmView.as_view(), name='auth-password-reset-confirm'),
    path('invitation/accept', InvitationAcceptView.as_view(), name='auth-invitation-accept'),
    path('google/start', GoogleStartView.as_view(), name='auth-google-start'),
    path('google/link', GoogleLinkView.as_view(), name='auth-google-link'),
    path('google/callback', GoogleCallbackView.as_view(), name='auth-google-callback'),
]
