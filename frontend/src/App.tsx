import { useEffect, useState, useRef } from "react";
import {
  LayoutDashboard,
  Building2,
  Layers,
  Box,
  Clock,
  TriangleAlert,
  Calculator,
  Route,
  FileText,
  FlaskConical,
  Siren,
  Handshake,
  ListChecks,
  ClipboardList,
  Settings,
  Menu,
  PanelLeftClose,
  Sun,
  Moon,
  LogOut,
  Search,
  Bell,
  Plus,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
  X,
} from "lucide-react";
import { api, clearSessionRequests } from "./api/client";
import { Brand } from "./components/Brand";
import { AuthPages, AccountPage } from "./auth/AuthPages";
import { DomainPage } from "./pages/DomainPage";
import { OperationsPage } from "./pages/OperationsPage";

const groups = [
  {
    name: "Boshqaruv markazi",
    items: [
      ["dashboard", "Boshqaruv paneli", LayoutDashboard],
      ["reports", "Hisobotlar", FileText],
    ],
  },
  {
    name: "Tashkilot va resurslar",
    items: [
      ["organizations", "Tashkilot", Building2],
      ["processes", "Jarayonlar", Layers],
      ["assets", "Aktivlar va bog‘liqliklar", Box],
      ["providers", "Provayderlar", Handshake],
    ],
  },
  {
    name: "Tahlil va tayyorgarlik",
    items: [
      ["bia", "Biznes ta’siri · BIA", Clock],
      ["risks", "Risklar reestri", TriangleAlert],
      ["engine", "Hisoblash yadrosi", Calculator],
      ["strategies", "Tiklash strategiyalari", Route],
      ["simulation", "Ssenariy sinovlari", FlaskConical],
    ],
  },
  {
    name: "Hodisalar va tiklanish",
    items: [
      ["incidents", "Hodisalar markazi", Siren],
      ["plans", "BCP / DRP rejalari", ClipboardList],
      ["tasks", "Yaxshilash vazifalari", ListChecks],
    ],
  },
  {
    name: "Nazorat va sozlamalar",
    items: [
      ["audit", "Audit jurnali", ClipboardList],
      ["settings", "Profil va xavfsizlik", Settings],
    ],
  },
];
const items = groups.flatMap((g) => g.items);
const aliases: Record<string, string> = {
  departments: "organizations",
  services: "organizations",
  users: "organizations",
  dependencies: "assets",
  controls: "risks",
  scenarios: "simulation",
  exercises: "simulation",
};
function initialPage() {
  const p = window.location.pathname.split("/")[1];
  return items.some((x) => x[0] === p) || aliases[p] ? p : "dashboard";
}

export function App() {
  const [user, setUser] = useState<any>(null),
    [checking, setChecking] = useState(true),
    [sessionError, setSessionError] = useState("");
  const [page, setPage] = useState(initialPage),
    [version, setVersion] = useState(0),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false);
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("uzhi-theme") === "light" ? "light" : "dark",
  );
  const [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [results, setResults] = useState<any[]>([]),
    [searching, setSearching] = useState(false),
    [searchError, setSearchError] = useState("");
  const [notices, setNotices] = useState<any[]>([]),
    [noticeError, setNoticeError] = useState(""),
    [showNotices, setShowNotices] = useState(false);
  const [noticeVersion, setNoticeVersion] = useState(0);
  useEffect(() => {
    const changed = () => setNoticeVersion((v) => v + 1);
    window.addEventListener("uzhi:data-changed", changed);
    return () => window.removeEventListener("uzhi:data-changed", changed);
  }, []);
  const [toast, setToast] = useState("");
  const activeUser = useRef<any>(null);
  activeUser.current = user;
  useEffect(() => {
    function shortcuts(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        e.preventDefault();
        (
          document.querySelector(".global-search input") as HTMLInputElement
        )?.focus();
      }
      if (e.key === "Escape") {
        if ((e.target as HTMLElement).closest(".global-search"))
          (e.target as HTMLElement).blur();
        setSearch("");
        setShowNotices(false);
        setMobile(false);
      }
    }
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("uzhi-theme", theme);
  }, [theme]);
  function clear() {
    clearSessionRequests();
    setUser(null);
    setResults([]);
    setSearch("");
    setNotices([]);
    setShowNotices(false);
    setPage("dashboard");
    setVersion((v) => v + 1);
  }
  async function check() {
    setChecking(true);
    setSessionError("");
    try {
      setUser(await api.getMe());
      if (window.location.pathname.includes("google/result")) {
        const status = new URLSearchParams(window.location.search).get(
          "status",
        );
        if (status === "linked") {
          setPage("settings");
          setToast("Google hisobi muvaffaqiyatli bog‘landi.");
        } else if (status === "success")
          setToast("Google orqali tizimga kirildi.");
      }
    } catch (e: any) {
      if (e.status !== 401 && e.status !== 403) setSessionError(e.message);
    } finally {
      setChecking(false);
    }
  }
  useEffect(() => {
    void check();
    const expired = () => {
      const hadUser = !!activeUser.current;
      clear();
      if (hadUser) setToast("Sessiya tugadi. Qayta tizimga kiring.");
    };
    window.addEventListener("uzhi:session-expired", expired);
    return () => window.removeEventListener("uzhi:session-expired", expired);
  }, []);
  useEffect(() => {
    const pop = () => setPage(initialPage());
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  function navigate(next: string) {
    setPage(next);
    setMobile(false);
    setSearch("");
    setResults([]);
    setShowNotices(false);
    window.history.pushState({}, "", `/${next}`);
  }
  useEffect(() => {
    let active = true;
    if (!user || user.preferences?.notifications === false) {
      setNotices([]);
      return;
    }
    api
      .list("improvement-tasks")
      .then((d) => {
        if (active) {
          setNotices(d.results.filter((v) => v.status !== "DONE"));
          setNoticeError("");
        }
      })
      .catch((e) => active && setNoticeError(e.message));
    return () => {
      active = false;
    };
  }, [user, page, version, noticeVersion]);
  useEffect(() => {
    let active = true;
    if (!user || search.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setSearchError("");
    const timer = setTimeout(async () => {
      try {
        const resources = [
          ["processes", "Jarayon"],
          ["risks", "Risk"],
          ["plans", "Reja"],
          ["providers", "Provayder"],
          ["incidents", "Hodisa"],
        ];
        const data = await Promise.all(
          resources.map(async ([resource, label]) => {
            const d = await api.list(resource, { search: search });
            return d.results
              .filter((r: any) =>
                JSON.stringify([r.name, r.title, r.threat, r.description])
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((r: any) => ({
                id: r.id,
                module: resource,
                label,
                title: r.name || r.title || r.threat,
              }));
          }),
        );
        if (active) setResults(data.flat().slice(0, 15));
      } catch (e: any) {
        if (active) setSearchError(e.message);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, user]);
  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await api.logout();
      clear();
      window.history.replaceState({}, "", "/auth/login");
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setBusy(false);
    }
  }
  const active = aliases[page] || page;
  const item = items.find((i) => i[0] === active);
  const label = String(item?.[1] || "Boshqaruv paneli");
  const group = groups.find((g) => g.items.some((i) => i[0] === active));
  if (checking)
    return (
      <main className="session-check">
        <Brand />
        <span className="spinner" />
        <p>Sessiya xavfsiz tekshirilmoqda…</p>
      </main>
    );
  if (!user)
    return (
      <>
        {sessionError && (
          <div className="session-error alert error" role="alert">
            {sessionError}
            <button className="btn" onClick={check}>
              Qayta tekshirish
            </button>
          </div>
        )}
        <AuthPages
          onLogin={(u) => {
            setUser(u);
            setPage("dashboard");
            setSessionError("");
            setVersion((v) => v + 1);
          }}
        />
      </>
    );
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a className="skip-link" href="#main">
        Asosiy tarkibga o‘tish
      </a>
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Menyuni yopish"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand compact={collapsed} />
          <button
            className="btn btn-icon collapse-btn"
            onClick={() => {
              setCollapsed(!collapsed);
              setMobile(false);
            }}
            aria-label="Menyuni yig‘ish"
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-dot" />
          <span>ISHCHI MAYDON</span>
          <span className="workspace-tier">BCMS</span>
        </div>
        <nav aria-label="Asosiy navigatsiya">
          {groups.map((g) => (
            <div className="nav-group" key={g.name}>
              <div className="nav-group-label">{g.name}</div>
              {g.items.map(([key, text, Icon]: any) => (
                <button
                  key={key}
                  title={text}
                  aria-current={active === key ? "page" : undefined}
                  className={`nav-item ${active === key ? "active" : ""}`}
                  onClick={() => navigate(key)}
                >
                  <Icon size={18} />
                  <span>{text}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="system-state">
            <span className="live-dot" />
            <span>Joriy sessiya faol</span>
          </div>
          <button
            className="profile-card"
            onClick={() => navigate("settings")}
            title="Profil va xavfsizlik"
          >
            <span className="avatar">
              {(user.first_name || user.username).slice(0, 1)}
            </span>
            <span>
              <strong>{user.first_name || user.username}</strong>
              <small>{user.role_display || user.role}</small>
            </span>
            <Settings size={16} />
          </button>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <button
            className="btn btn-icon mobile-menu"
            aria-label="Menyuni ochish"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <span>{group?.name}</span>
            <ChevronRight size={14} />
            <strong>{label}</strong>
          </div>
          <div className="topbar-actions">
            <div className="global-search">
              <Search size={17} />
              <input
                aria-label="Platforma bo‘ylab qidirish"
                placeholder="Qidirish…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>/</kbd>
              <button
                className="search-close"
                aria-label="Qidiruvni yopish"
                onClick={(e) => {
                  setSearch("");
                  (
                    document.querySelector(
                      ".global-search input",
                    ) as HTMLInputElement
                  )?.blur();
                  e.currentTarget.blur();
                }}
              >
                <X size={16} />
              </button>
              {search.length >= 2 && (
                <div
                  className="search-results"
                  role="region"
                  aria-label="Qidiruv natijalari"
                >
                  {searching ? (
                    <p>Qidirilmoqda…</p>
                  ) : searchError ? (
                    <div role="alert">{searchError}</div>
                  ) : results.length ? (
                    results.map((r) => (
                      <button
                        key={`${r.module}${r.id}`}
                        onClick={() => {
                          navigate(r.module);
                          window.history.replaceState(
                            {},
                            "",
                            `/${r.module}?q=${encodeURIComponent(r.title)}`,
                          );
                        }}
                      >
                        <span>
                          {r.title}
                          <small>
                            {r.label} · #{r.id}
                          </small>
                        </span>
                        <ArrowUpRight size={16} />
                      </button>
                    ))
                  ) : (
                    <p>Mos yozuv topilmadi.</p>
                  )}
                </div>
              )}
            </div>
            <button
              className="btn btn-icon"
              aria-label="Temani almashtirish"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="notification-wrap">
              <button
                className="btn btn-icon"
                aria-label="Bildirishnomalar"
                aria-expanded={showNotices}
                onClick={() => setShowNotices(!showNotices)}
              >
                <Bell size={18} />
                {notices.length > 0 && <i className="notification-dot" />}
              </button>
              {showNotices && (
                <div className="search-results notification-panel">
                  <h3>Ochiq vazifalar</h3>
                  {noticeError ? (
                    <p role="alert">{noticeError}</p>
                  ) : notices.length ? (
                    notices.map((n) => (
                      <button key={n.id} onClick={() => navigate("tasks")}>
                        <span>
                          {n.title}
                          <small>{n.due_date || "Muddat belgilanmagan"}</small>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ))
                  ) : (
                    <p>Ochiq vazifa yo‘q.</p>
                  )}
                </div>
              )}
            </div>
            <button
              className="btn btn-icon"
              aria-label="Tizimdan chiqish"
              title="Tizimdan chiqish"
              disabled={busy}
              onClick={logout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <div className="context-bar">
          <span>
            <Building2 size={15} />
            {user.organization_detail?.name || "Tashkilot biriktirilmagan"}
          </span>
          <span className="context-role">{user.role_display || user.role}</span>
          <div className="context-tools">
            <button
              className="btn btn-small"
              onClick={() => setVersion((v) => v + 1)}
            >
              <RefreshCw size={14} /> Yangilash
            </button>
            {user.role !== "AUDITOR" && (
              <button
                className="btn btn-primary btn-small"
                onClick={() => navigate("incidents")}
              >
                <Plus size={14} /> Hodisa ochish
              </button>
            )}
          </div>
        </div>
        <main
          id="main"
          className="main-content"
          key={`${user.id}-${page}-${version}`}
        >
          {page === "settings" ? (
            <AccountPage
              user={user}
              onUpdate={setUser}
              onLogout={() => {
                clear();
                window.history.replaceState({}, "", "/auth/login");
              }}
            />
          ) : ["providers", "incidents", "tasks"].includes(page) ? (
            <OperationsPage module={page} user={user} onNavigate={navigate} />
          ) : (
            <DomainPage module={page} user={user} onNavigate={navigate} />
          )}
        </main>
        <footer className="app-footer">
          <span>Uzluksiz Himoya</span>
          <span>Ma’lumotlar · Mas’uliyat · Tayyorlik</span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            className="btn btn-icon"
            aria-label="Xabarni yopish"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
