from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.authentication.views import LoginView, LogoutView, MeView, UserViewSet
from apps.organizations.views import OrganizationViewSet, DepartmentViewSet, ServiceViewSet
from apps.core.views import AuditLogViewSet
from apps.processes.views import BusinessProcessViewSet, AssetViewSet, DependencyViewSet
from apps.bia.views import BIAAssessmentViewSet
from apps.risks.views import RiskViewSet, ControlViewSet
from apps.plans.views import StrategyViewSet, ContinuityPlanViewSet
from apps.simulation.views import ScenarioViewSet, ExerciseViewSet
from apps.engine.views import PriorityAnalysisView, EvaluateRiskAlgorithmView, EvaluateStrategyView
from apps.reports.views import OrganizationDashboardReportView

router = DefaultRouter()
# Core & Auth
router.register(r'users', UserViewSet, basename='user')
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'services', ServiceViewSet, basename='service')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

# Phase 2: Registry & Assessments
router.register(r'processes', BusinessProcessViewSet, basename='process')
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'dependencies', DependencyViewSet, basename='dependency')
router.register(r'bia', BIAAssessmentViewSet, basename='bia')
router.register(r'risks', RiskViewSet, basename='risk')
router.register(r'controls', ControlViewSet, basename='control')

# Phase 3 & 4: Plans, Scenarios, Exercises
router.register(r'strategies', StrategyViewSet, basename='strategy')
router.register(r'plans', ContinuityPlanViewSet, basename='plan')
router.register(r'scenarios', ScenarioViewSet, basename='scenario')
router.register(r'exercises', ExerciseViewSet, basename='exercise')

from django.views.generic import TemplateView

urlpatterns = [
    path('', TemplateView.as_view(template_name='index.html'), name='frontend-home'),
    path('admin/', admin.site.urls),
    # Autentifikatsiya (FR-01)
    path('api/v1/auth/login', LoginView.as_view(), name='auth-login'),
    path('api/v1/auth/logout', LogoutView.as_view(), name='auth-logout'),
    path('api/v1/auth/me', MeView.as_view(), name='auth-me'),

    # Hisoblash yadrosi tahlil endpointlari (FR-07, FR-08)
    path('api/v1/analyses/priority', PriorityAnalysisView.as_view(), name='analysis-priority'),
    path('api/v1/analyses/evaluate-risk', EvaluateRiskAlgorithmView.as_view(), name='analysis-evaluate-risk'),
    path('api/v1/analyses/evaluate-strategy', EvaluateStrategyView.as_view(), name='analysis-evaluate-strategy'),

    # Dashboard konsolidatsiyasi (FR-11)
    path('api/v1/reports/organization', OrganizationDashboardReportView.as_view(), name='report-dashboard'),

    # Resurs routerlari
    path('api/v1/', include(router.urls)),
]
