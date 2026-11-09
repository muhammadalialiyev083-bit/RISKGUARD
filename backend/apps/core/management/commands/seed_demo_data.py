from django.core.management.base import BaseCommand
from apps.organizations.models import Organization, Department, Service
from apps.authentication.models import User
from apps.processes.models import BusinessProcess, Asset, Dependency
from apps.bia.models import BIAAssessment, BIAImpact
from apps.risks.models import Risk, Control
from apps.plans.models import ContinuityPlan, PlanStep, Strategy
from apps.simulation.models import Scenario
from apps.core.audit import record_audit


class Command(BaseCommand):
    help = "Hujjat 12.1 demo ssenariysi bo'yicha namunaviy ma'lumotlarni bazaga yuklash"

    def handle(self, *args, **options):
        self.stdout.write("Namunaviy pilot ma'lumotlari yaratilmoqda...")

        # 1. Tashkilot
        org, _ = Organization.objects.get_or_create(
            name="Farg'ona Davlat Texnika Universiteti",
            defaults={
                'sector': "Oliy ta'lim",
                'timezone': "Asia/Tashkent",
                'max_acceptable_loss': 300000000.00,
                'risk_low_threshold': 6,
                'risk_medium_threshold': 14
            }
        )

        dept, _ = Department.objects.get_or_create(
            organization=org,
            name="Axborot texnologiyalari va raqamlashtirish markazi",
            defaults={'head_name': "Turdimatov M.M."}
        )

        # 2. Foydalanuvchilar (Parol: Admin123!)
        admin_user, _ = User.objects.get_or_create(
            username="admin",
            defaults={
                'email': "admin@fardut.uz",
                'role': User.ROLE_ADMIN,
                'organization': org,
                'department': dept,
                'first_name': "Muhammadali",
                'last_name': "Aliyev"
            }
        )
        admin_user.set_password("Admin123!")
        admin_user.save()

        manager, _ = User.objects.get_or_create(
            username="bcms_manager",
            defaults={
                'email': "manager@fardut.uz",
                'role': User.ROLE_BCMS_MANAGER,
                'organization': org,
                'department': dept,
                'first_name': "BCMS",
                'last_name': "Menejeri"
            }
        )
        manager.set_password("Admin123!")
        manager.save()

        approver, _ = User.objects.get_or_create(
            username="director",
            defaults={
                'email': "director@fardut.uz",
                'role': User.ROLE_APPROVER,
                'organization': org,
                'department': dept,
                'first_name': "Mamirjon",
                'last_name': "Turdimatov"
            }
        )
        approver.set_password("Admin123!")
        approver.save()

        # 3. Xizmat
        lms_service, _ = Service.objects.get_or_create(
            organization=org,
            name="Axborot ta'lim platformasi (HEMIS & LMS)",
            defaults={'owner': manager}
        )

        # 4. Aktivlar (Server, DB, Elektr, Internet)
        db_asset, _ = Asset.objects.get_or_create(
            organization=org,
            name="Asosiy Ma'lumotlar Bazasi Klasteri (PostgreSQL)",
            defaults={'type': 'SERVER', 'owner': admin_user}
        )
        power_asset, _ = Asset.objects.get_or_create(
            organization=org,
            name="Universitet Markaziy UPS va Generator",
            defaults={'type': 'FACILITY', 'owner': admin_user}
        )
        net_asset, _ = Asset.objects.get_or_create(
            organization=org,
            name="Optik Internet Provayder (Uztelecom)",
            defaults={'type': 'VENDOR', 'owner': admin_user}
        )

        # 5. Biznes jarayonlar: Elektron ta'lim, Talabalar hisoboti, To'lovlar, Kutubxona
        procs_data = [
            ("Universitet elektron ta'lim xizmati", "CRITICAL", 4.0, 12.0, 60, 360),
            ("Talabalar akademik hisoboti", "HIGH", 8.0, 24.0, 120, 120),
            ("Shartnoma to'lovlari tizimi", "CRITICAL", 2.0, 8.0, 30, 30),
            ("Elektron kutubxona xizmati", "MEDIUM", 24.0, 72.0, 360, 360)
        ]

        created_procs = []
        for name, crit, rto, mtpd, rpo, backup_int in procs_data:
            p, _ = BusinessProcess.objects.get_or_create(
                organization=org,
                name=name,
                defaults={
                    'service': lms_service,
                    'owner': manager,
                    'criticality': crit
                }
            )
            created_procs.append(p)

            # Dependency to DB asset
            Dependency.objects.get_or_create(
                organization=org,
                from_type='PROCESS',
                from_id=p.id,
                to_type='ASSET',
                to_id=db_asset.id,
                defaults={'dependency_criticality': 'MANDATORY'}
            )

            # BIA
            bia, _ = BIAAssessment.objects.get_or_create(
                organization=org,
                process=p,
                defaults={
                    'rto_hours': rto,
                    'mtpd_hours': mtpd,
                    'rpo_minutes': rpo,
                    'backup_interval_minutes': backup_int,
                    'status': 'APPROVED',
                    'approved_by': approver
                }
            )

            # BIA Impact
            BIAImpact.objects.get_or_create(
                bia=bia,
                horizon_hours=mtpd,
                defaults={
                    'financial_loss': 80000000.00,
                    'operational_score': 5 if crit == 'CRITICAL' else 3,
                    'legal_score': 4,
                    'reputational_score': 5
                }
            )

            # Risk
            r, _ = Risk.objects.get_or_create(
                organization=org,
                process=p,
                threat="Markaziy ma'lumotlar bazasi ishdan chiqishi",
                defaults={
                    'asset': db_asset,
                    'likelihood': 4,
                    'impact': 5,
                    'likelihood_residual': 2,
                    'impact_residual': 2,
                    'owner': manager
                }
            )
            Control.objects.get_or_create(
                risk=r,
                title="Kundalik replikatsiya va avariyaviy zaxira klasteri",
                defaults={'status': 'IMPLEMENTED'}
            )

        # 6. Ssenariy (Hujjat 12.1)
        sc, _ = Scenario.objects.get_or_create(
            organization=org,
            title="Asosiy ma'lumotlar bazasi klasteri ishlamay qolishi",
            defaults={
                'description': "Asosiy PostgreSQL ma'lumotlar bazasida apparat avariyasi yuz berdi.",
                'disrupted_asset_ids': [db_asset.id],
                'estimated_outage_hours': 8.0
            }
        )

        # 7. BCP Rejasi
        plan, _ = ContinuityPlan.objects.get_or_create(
            organization=org,
            process=created_procs[0],
            title="Elektron ta'lim xizmatini avariyaviy qayta tiklash rejasi",
            defaults={
                'version': "1.0",
                'status': 'PUBLISHED',
                'approved_by': approver
            }
        )
        PlanStep.objects.get_or_create(
            plan=plan,
            sequence=1,
            title="Avariya haqida BCMS jamoasini xabardor qilish",
            defaults={'assigned_to': manager, 'expected_duration_minutes': 15}
        )
        PlanStep.objects.get_or_create(
            plan=plan,
            sequence=2,
            title="Zaxira replika bazasiga DNS orqali yo'naltirish (Failover)",
            defaults={'assigned_to': admin_user, 'expected_duration_minutes': 30}
        )
        PlanStep.objects.get_or_create(
            plan=plan,
            sequence=3,
            title="Ma'lumotlar yaxlitligini tekshirish va xizmatni qayta yoqish",
            defaults={'assigned_to': admin_user, 'expected_duration_minutes': 45}
        )

        self.stdout.write(self.style.SUCCESS("Demo pilot ma'lumotlari muvaffaqiyatli yuklandi!"))
        self.stdout.write("Foydalanuvchilar: admin (Admin123!), bcms_manager (Admin123!), director (Admin123!)")
