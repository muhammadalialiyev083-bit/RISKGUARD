"""BCMS Designer — FastAPI application entry point."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings

app = FastAPI(
    title="BCMS Designer API",
    description="ISO 22301 Business Continuity Management System — Farg'ona Davlat Texnika Universiteti",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── Middleware ──
app.add_middleware(SessionMiddleware, secret_key=settings.SESSION_SECRET, max_age=86400)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Register routers (lazy import to avoid circular deps) ──
def _register_routers() -> None:
    from app.routers import auth, users, organizations, processes, bia, risks, plans, simulation, engine, reports, audit

    app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
    app.include_router(users.router, prefix="/api/v1", tags=["Users"])
    app.include_router(organizations.router, prefix="/api/v1", tags=["Organizations"])
    app.include_router(processes.router, prefix="/api/v1", tags=["Processes & Assets"])
    app.include_router(bia.router, prefix="/api/v1", tags=["BIA"])
    app.include_router(risks.router, prefix="/api/v1", tags=["Risks"])
    app.include_router(plans.router, prefix="/api/v1", tags=["Plans & Strategies"])
    app.include_router(simulation.router, prefix="/api/v1", tags=["Simulation"])
    app.include_router(engine.router, prefix="/api/v1/analyses", tags=["Engine"])
    app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
    app.include_router(audit.router, prefix="/api/v1", tags=["Audit"])


_register_routers()


# ── Health check ──
@app.get("/api/health", tags=["System"])
def health_check():
    return {"status": "ok", "service": "BCMS Designer API"}
