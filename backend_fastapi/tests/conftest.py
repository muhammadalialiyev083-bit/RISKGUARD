"""Test configuration and fixtures for BCMS Designer FastAPI."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.models import Base
from app.main import app
from seed_data import seed

# In-memory SQLite for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables and seed demo data once per test session."""
    Base.metadata.create_all(bind=test_engine)
    
    # Run seeder with test session
    import sys, os
    db = TestingSessionLocal()
    from app.models.organization import Organization, Department, Service
    from app.models.user import User
    from app.models.process import BusinessProcess, Asset, Dependency
    from app.models.bia import BIAAssessment
    from app.models.risk import Risk, Control
    from app.models.plan import Strategy, ContinuityPlan, PlanStep
    from app.models.simulation import Scenario, Exercise
    from app.utils.security import hash_password
    from datetime import date, datetime

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

    dept_it = Department(organization_id=org.id, name="IT Bo'limi", head_name="Aliyev M.")
    dept_edu = Department(organization_id=org.id, name="O'quv bo'limi", head_name="Karimova N.")
    db.add_all([dept_it, dept_edu])
    db.flush()

    svc = Service(organization_id=org.id, name="Elektron ta'lim platformasi", description="Online ta'lim")
    db.add(svc)
    db.flush()

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

    proc1 = BusinessProcess(organization_id=org.id, service_id=svc.id, name="Online ta'lim platformasi", criticality="CRITICAL", owner_id=manager.id)
    proc2 = BusinessProcess(organization_id=org.id, service_id=svc.id, name="Talaba qaydnomasi", criticality="HIGH", owner_id=manager.id)
    db.add_all([proc1, proc2])
    db.flush()

    asset1 = Asset(organization_id=org.id, name="Asosiy server", type="SERVER", owner_id=admin.id)
    asset2 = Asset(organization_id=org.id, name="PostgreSQL DB", type="SERVER", owner_id=admin.id)
    db.add_all([asset1, asset2])
    db.flush()

    dep = Dependency(organization_id=org.id, from_type="PROCESS", from_id=proc1.id, to_type="ASSET", to_id=asset1.id, dependency_criticality="MANDATORY")
    db.add(dep)
    db.flush()

    bia = BIAAssessment(
        organization_id=org.id, process_id=proc1.id, revision=1,
        mtpd_hours=4.0, rto_hours=2.0, rpo_minutes=30, backup_interval_minutes=60,
        status="DRAFT",
    )
    db.add(bia)
    db.flush()

    risk = Risk(
        organization_id=org.id, process_id=proc1.id, asset_id=asset1.id,
        threat="Server nosozligi", vulnerability="Eski uskuna",
        likelihood=3, impact=5, owner_id=admin.id, status="ASSESSED",
    )
    db.add(risk)
    db.flush()

    plan = ContinuityPlan(
        organization_id=org.id, process_id=proc1.id,
        title="LMS Tiklash Rejasi", version="1.0", scope="LMS", status="DRAFT",
    )
    db.add(plan)
    db.flush()

    step = PlanStep(plan_id=plan.id, sequence=1, title="Serverni qayta yuklash", assigned_to_id=admin.id, expected_duration_minutes=15)
    db.add(step)
    db.flush()

    scenario = Scenario(
        organization_id=org.id, title="Server uzilishi",
        description="Asosiy server ishdan chiqdi",
        disrupted_asset_ids=[asset1.id], estimated_outage_hours=6.0,
    )
    db.add(scenario)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client():
    """TestClient that uses testing DB session."""
    return TestClient(app)


@pytest.fixture
def auth_client():
    """TestClient logged in as bcms_manager."""
    c = TestClient(app)
    res = c.post("/api/v1/auth/login", json={"username": "bcms_manager", "password": "Admin123!"})
    assert res.status_code == 200
    return c


@pytest.fixture
def admin_client():
    """TestClient logged in as admin."""
    c = TestClient(app)
    res = c.post("/api/v1/auth/login", json={"username": "admin", "password": "Admin123!"})
    assert res.status_code == 200
    return c


@pytest.fixture
def approver_client():
    """TestClient logged in as director (APPROVER)."""
    c = TestClient(app)
    res = c.post("/api/v1/auth/login", json={"username": "director", "password": "Admin123!"})
    assert res.status_code == 200
    return c
