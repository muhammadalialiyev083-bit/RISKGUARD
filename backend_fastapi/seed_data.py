"""Demo data seeder — creates pilot organization, users, and sample data.

Usage: python seed_data.py

Demo users (password: Admin123!):
  - admin (ADMIN)
  - bcms_manager (BCMS_MANAGER)
  - director (APPROVER)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine
from app.models import Base
from app.models.organization import Organization, Department, Service
from app.models.user import User
from app.models.process import BusinessProcess, Asset, Dependency
from app.models.bia import BIAAssessment
from app.models.risk import Risk, Control
from app.models.plan import Strategy, ContinuityPlan, PlanStep
from app.models.simulation import Scenario, Exercise
from app.utils.security import hash_password
from datetime import date, datetime


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if already seeded
        existing_org = db.query(Organization).filter(Organization.name == "Farg'ona Davlat Texnika Universiteti").first()
        if existing_org:
            print("Demo ma'lumotlar allaqachon mavjud. O'tkazib yuborildi.")
            return

        print("Demo ma'lumotlar yuklanmoqda...")

        # Organization
        org = Organization(
            name="Farg'ona Davlat Texnika Universiteti",
            sector="Oliy ta'lim",
            timezone="Asia/Tashkent",
            max_acceptable_loss=500000000.00,
            risk_low_threshold=6,
            risk_medium_threshold=14,
        )
        db.add(org)
        db.flush()

        # Departments
        dept_it = Department(organization_id=org.id, name="Axborot texnologiyalari bo'limi", head_name="Aliyev M.")
        dept_edu = Department(organization_id=org.id, name="O'quv bo'limi", head_name="Karimova N.")
        dept_fin = Department(organization_id=org.id, name="Moliya bo'limi", head_name="Toshmatov R.")
        db.add_all([dept_it, dept_edu, dept_fin])
        db.flush()

        # Services
        svc_elearn = Service(organization_id=org.id, name="Elektron ta'lim platformasi", description="Online ta'lim va video darslar tizimi")
        svc_hemis = Service(organization_id=org.id, name="HEMIS tizimi", description="Talabalar ma'lumotlari boshqaruv tizimi")
        svc_finance = Service(organization_id=org.id, name="Moliya-buxgalteriya tizimi", description="Budjet va to'lov boshqaruvi")
        svc_infra = Service(organization_id=org.id, name="IT Infratuzilma xizmatlari", description="Serverlar, tarmoq, xavfsizlik")
        db.add_all([svc_elearn, svc_hemis, svc_finance, svc_infra])
        db.flush()

        # Users
        pwd = hash_password("Admin123!")
        admin = User(
            username="admin", email="admin@fstu.uz", hashed_password=pwd,
            first_name="Muhammadali", last_name="Aliyev",
            role="ADMIN", organization_id=org.id, department_id=dept_it.id,
            is_superuser=True,
        )
        manager = User(
            username="bcms_manager", email="bcms@fstu.uz", hashed_password=pwd,
            first_name="BCMS", last_name="Menejeri",
            role="BCMS_MANAGER", organization_id=org.id, department_id=dept_it.id,
        )
        director = User(
            username="director", email="director@fstu.uz", hashed_password=pwd,
            first_name="Mamirjon", last_name="Turdimatov",
            role="APPROVER", organization_id=org.id, department_id=dept_edu.id,
        )
        db.add_all([admin, manager, director])
        db.flush()

        # Business Processes
        proc_lms = BusinessProcess(organization_id=org.id, service_id=svc_elearn.id, name="Online ta'lim platformasi ishlashi", criticality="CRITICAL", owner_id=manager.id)
        proc_hemis = BusinessProcess(organization_id=org.id, service_id=svc_hemis.id, name="Talaba qaydnomasi va baholar kiritish", criticality="CRITICAL", owner_id=manager.id)
        proc_exam = BusinessProcess(organization_id=org.id, service_id=svc_hemis.id, name="Imtihon qabul qilish jarayoni", criticality="HIGH", owner_id=manager.id)
        proc_fin = BusinessProcess(organization_id=org.id, service_id=svc_finance.id, name="Oylik maosh hisob-kitobi", criticality="HIGH", owner_id=manager.id)
        proc_email = BusinessProcess(organization_id=org.id, service_id=svc_infra.id, name="Korporativ elektron pochta", criticality="MEDIUM", owner_id=manager.id)
        proc_backup = BusinessProcess(organization_id=org.id, service_id=svc_infra.id, name="Zaxira nusxalash tizimi", criticality="CRITICAL", owner_id=admin.id)
        db.add_all([proc_lms, proc_hemis, proc_exam, proc_fin, proc_email, proc_backup])
        db.flush()

        # Assets
        asset_srv1 = Asset(organization_id=org.id, name="Asosiy veb-server (nginx)", type="SERVER", owner_id=admin.id)
        asset_db = Asset(organization_id=org.id, name="PostgreSQL DB server", type="SERVER", owner_id=admin.id)
        asset_lms = Asset(organization_id=org.id, name="Moodle LMS dasturi", type="SYSTEM", owner_id=manager.id)
        asset_hemis_sys = Asset(organization_id=org.id, name="HEMIS dasturiy moduli", type="SYSTEM", owner_id=manager.id)
        asset_admin_pers = Asset(organization_id=org.id, name="IT bo'limi xodimlari", type="PERSONNEL", owner_id=admin.id)
        asset_isp = Asset(organization_id=org.id, name="Internet provayderi (Uzbektelekom)", type="VENDOR", owner_id=admin.id)
        asset_dc = Asset(organization_id=org.id, name="Server xonasi (1-bino, 3-qavat)", type="FACILITY", owner_id=admin.id)
        db.add_all([asset_srv1, asset_db, asset_lms, asset_hemis_sys, asset_admin_pers, asset_isp, asset_dc])
        db.flush()

        # Dependencies
        db.add_all([
            Dependency(organization_id=org.id, from_type="PROCESS", from_id=proc_lms.id, to_type="ASSET", to_id=asset_srv1.id),
            Dependency(organization_id=org.id, from_type="PROCESS", from_id=proc_lms.id, to_type="ASSET", to_id=asset_db.id),
            Dependency(organization_id=org.id, from_type="PROCESS", from_id=proc_lms.id, to_type="ASSET", to_id=asset_lms.id),
            Dependency(organization_id=org.id, from_type="PROCESS", from_id=proc_hemis.id, to_type="ASSET", to_id=asset_db.id),
            Dependency(organization_id=org.id, from_type="PROCESS", from_id=proc_hemis.id, to_type="ASSET", to_id=asset_hemis_sys.id),
            Dependency(organization_id=org.id, from_type="PROCESS", from_id=proc_backup.id, to_type="ASSET", to_id=asset_db.id),
            Dependency(organization_id=org.id, from_type="PROCESS", from_id=proc_backup.id, to_type="ASSET", to_id=asset_dc.id),
        ])
        db.flush()

        # BIA Assessments
        bia_lms = BIAAssessment(organization_id=org.id, process_id=proc_lms.id, revision=1, mtpd_hours=4.0, rto_hours=2.0, rpo_minutes=30, backup_interval_minutes=60, status="APPROVED", approved_by_id=director.id, approved_at=datetime.utcnow())
        bia_hemis = BIAAssessment(organization_id=org.id, process_id=proc_hemis.id, revision=1, mtpd_hours=8.0, rto_hours=4.0, rpo_minutes=60, backup_interval_minutes=120, status="APPROVED", approved_by_id=director.id, approved_at=datetime.utcnow())
        bia_exam = BIAAssessment(organization_id=org.id, process_id=proc_exam.id, revision=1, mtpd_hours=12.0, rto_hours=6.0, rpo_minutes=60, backup_interval_minutes=60, status="DRAFT")
        bia_fin = BIAAssessment(organization_id=org.id, process_id=proc_fin.id, revision=1, mtpd_hours=24.0, rto_hours=12.0, rpo_minutes=120, backup_interval_minutes=360, status="SUBMITTED")
        bia_email = BIAAssessment(organization_id=org.id, process_id=proc_email.id, revision=1, mtpd_hours=48.0, rto_hours=24.0, rpo_minutes=240, backup_interval_minutes=120, status="DRAFT")
        db.add_all([bia_lms, bia_hemis, bia_exam, bia_fin, bia_email])
        db.flush()

        # Risks
        risk1 = Risk(organization_id=org.id, process_id=proc_lms.id, asset_id=asset_srv1.id, threat="Server apparat nosozligi", vulnerability="Eski uskunalar, 5+ yillik server", likelihood=3, impact=5, likelihood_residual=2, impact_residual=3, owner_id=admin.id, status="ASSESSED")
        risk2 = Risk(organization_id=org.id, process_id=proc_hemis.id, asset_id=asset_db.id, threat="Ma'lumotlar bazasi buzilishi", vulnerability="RAID konfiguratsiyasi optimal emas", likelihood=2, impact=5, likelihood_residual=1, impact_residual=3, owner_id=admin.id, status="MITIGATED")
        risk3 = Risk(organization_id=org.id, process_id=proc_lms.id, asset_id=asset_isp.id, threat="Internet aloqasi uzilishi", vulnerability="Yagona provayder, zaxira kanal yo'q", likelihood=4, impact=4, owner_id=manager.id, status="IDENTIFIED")
        risk4 = Risk(organization_id=org.id, process_id=proc_fin.id, threat="Moliyaviy tizimga ruxsatsiz kirish", vulnerability="Parol siyosati zaif", likelihood=3, impact=4, likelihood_residual=2, impact_residual=2, owner_id=manager.id, status="MITIGATED")
        risk5 = Risk(organization_id=org.id, process_id=proc_backup.id, asset_id=asset_dc.id, threat="Server xonasida suv bosishi", vulnerability="Drenaj tizimi eski", likelihood=2, impact=5, owner_id=admin.id, status="IDENTIFIED")
        risk6 = Risk(organization_id=org.id, process_id=proc_exam.id, threat="Imtihon tizimi DDoS hujumiga uchrashi", vulnerability="WAF himoya mavjud emas", likelihood=3, impact=3, owner_id=manager.id, status="ASSESSED")
        db.add_all([risk1, risk2, risk3, risk4, risk5, risk6])
        db.flush()

        # Controls
        db.add_all([
            Control(risk_id=risk1.id, title="Zaxira server o'rnatish", description="Hotstandby server sozlash", status="PLANNED"),
            Control(risk_id=risk2.id, title="RAID-10 konfiguratsiya", description="Disklar RAID-10 ga o'tkazish", status="IMPLEMENTED"),
            Control(risk_id=risk3.id, title="Ikkinchi ISP ulash", description="Zaxira internet kanali", status="PLANNED"),
            Control(risk_id=risk4.id, title="Ikki bosqichli autentifikatsiya", description="2FA joriy etish", status="IMPLEMENTED"),
        ])
        db.flush()

        # Strategies
        db.add_all([
            Strategy(organization_id=org.id, process_id=proc_lms.id, name="Zaxira serverga o'tish (Hot Standby)", estimated_rto_hours=2.0, estimated_rpo_minutes=30, estimated_cost=15000000, is_selected=True),
            Strategy(organization_id=org.id, process_id=proc_lms.id, name="Bulutli muhitga ko'chirish (Cloud DR)", estimated_rto_hours=1.0, estimated_rpo_minutes=15, estimated_cost=45000000),
            Strategy(organization_id=org.id, process_id=proc_hemis.id, name="Ma'lumotlar bazasi replika", estimated_rto_hours=4.0, estimated_rpo_minutes=60, estimated_cost=8000000, is_selected=True),
        ])
        db.flush()

        # Continuity Plans
        plan_lms = ContinuityPlan(organization_id=org.id, process_id=proc_lms.id, title="LMS Tiklash Rejasi (DRP)", version="1.2", scope="Moodle platformasi va unga bog'liq barcha xizmatlar", status="PUBLISHED", approved_by_id=director.id, approved_at=datetime.utcnow())
        plan_hemis = ContinuityPlan(organization_id=org.id, process_id=proc_hemis.id, title="HEMIS BCP Rejasi", version="1.0", scope="Talabalar ma'lumotlari va baholar tizimi", status="DRAFT")
        db.add_all([plan_lms, plan_hemis])
        db.flush()

        # Plan Steps
        db.add_all([
            PlanStep(plan_id=plan_lms.id, sequence=1, title="Nosozlikni aniqlash va xabar berish", assigned_to_id=admin.id, expected_duration_minutes=15),
            PlanStep(plan_id=plan_lms.id, sequence=2, title="Zaxira serverga trafikni yo'naltirish", assigned_to_id=admin.id, expected_duration_minutes=30),
            PlanStep(plan_id=plan_lms.id, sequence=3, title="Ma'lumotlar bazasini sinxronlashtirish", assigned_to_id=manager.id, expected_duration_minutes=45),
            PlanStep(plan_id=plan_lms.id, sequence=4, title="Xizmatni tekshirish va foydalanuvchilarga xabar berish", assigned_to_id=manager.id, expected_duration_minutes=20),
            PlanStep(plan_id=plan_hemis.id, sequence=1, title="DB replikani faollashtirish", assigned_to_id=admin.id, expected_duration_minutes=60),
            PlanStep(plan_id=plan_hemis.id, sequence=2, title="HEMIS dasturini zaxira serverda ishga tushirish", assigned_to_id=manager.id, expected_duration_minutes=30),
        ])
        db.flush()

        # Scenarios
        sc1 = Scenario(organization_id=org.id, title="Asosiy server nosozligi", description="Asosiy veb-server va DB serveri bir vaqtda ishdan chiqishi", disrupted_asset_ids=[asset_srv1.id, asset_db.id], estimated_outage_hours=6.0)
        sc2 = Scenario(organization_id=org.id, title="Internet aloqasi to'liq uzilishi", description="Barcha tashqi aloqa kanallari 12 soat davomida ishlamaydi", disrupted_asset_ids=[asset_isp.id], estimated_outage_hours=12.0)
        db.add_all([sc1, sc2])
        db.flush()

        # Exercises
        db.add_all([
            Exercise(organization_id=org.id, plan_id=plan_lms.id, scenario_id=sc1.id, exercise_date=date(2026, 9, 15), actual_recovery_hours=2.5, outcome="SUCCESS", findings="DNS propagatsiya vaqti kutilgandan uzoq."),
        ])

        db.commit()
        print("Demo ma'lumotlar muvaffaqiyatli yuklandi!")
        print("\nDemo foydalanuvchilar (parol: Admin123!):")
        print("  admin       — ADMIN")
        print("  bcms_manager — BCMS_MANAGER")
        print("  director    — APPROVER")

    except Exception as e:
        db.rollback()
        print(f"Xatolik: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
