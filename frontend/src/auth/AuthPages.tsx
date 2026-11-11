import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { api, clearSessionRequests } from "../api/client";
import { Brand } from "../components/Brand";

function Password({
  name,
  label = "Parol",
  autoComplete = "current-password",
}: {
  name: string;
  label?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field">
      {label}
      <span className="password-field">
        <input
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={autoComplete === "new-password" ? 8 : undefined}
        />
        <button
          type="button"
          className="btn btn-icon"
          aria-label={visible ? "Parolni yashirish" : "Parolni ko‘rsatish"}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}
export function AuthPages({ onLogin }: { onLogin: (user: any) => void }) {
  const path = window.location.pathname;
  const [mode, setMode] = useState(
    path.includes("reset")
      ? "reset"
      : path.includes("invitation")
        ? "invite"
        : path.includes("forgot")
          ? "forgot"
          : "login",
  );
  const [config, setConfig] = useState<any>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false),
    [done, setDone] = useState(false);
  const query = new URLSearchParams(
    window.location.hash
      ? window.location.hash.slice(1)
      : window.location.search,
  );
  useEffect(() => {
    let current = true;
    api
      .get("/auth/config")
      .then((v) => current && setConfig(v))
      .catch(() => current && setConfig({}));
    return () => {
      current = false;
    };
  }, []);
  function change(next: string) {
    setMode(next);
    setError("");
    setSent(false);
    setDone(false);
    window.history.replaceState(
      {},
      "",
      next === "forgot" ? "/auth/forgot" : "/auth/login",
    );
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const d = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (mode === "login") {
        clearSessionRequests();
        const result = await api.login({
          username: String(d.username),
          password: String(d.password),
        });
        onLogin(result.user);
        window.history.replaceState({}, "", "/dashboard");
      } else if (mode === "forgot") {
        await api.post("/auth/password/reset", { email: d.email });
        setSent(true);
      } else {
        await api.post(
          mode === "invite"
            ? "/auth/invitation/accept"
            : "/auth/password/reset/confirm",
          { ...d, uid: query.get("uid"), token: query.get("token") },
        );
        setDone(true);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const oauthStatus = new URLSearchParams(window.location.search).get("status");
  const oauthMessages: Record<string, string> = {
    cancelled: "Google orqali kirish bekor qilindi. Qayta urinishingiz mumkin.",
    invalid_callback:
      "Google havolasi eskirgan yoki tekshiruvdan o‘tmadi. Kirishni qayta boshlang.",
    approval_required:
      "Google hisobi UzHi hisobiga bog‘lanmagan. Tashkilot administratoridan taklif oling, mahalliy hisobga kirib Profil orqali Google hisobini bog‘lang.",
  };
  const oauthError = path.includes("google/result")
    ? oauthMessages[oauthStatus || ""]
    : "";
  const titles: any = {
    login: [
      "Ishonchli boshqaruv shu yerdan boshlanadi.",
      "Hisobingizga kirish",
    ],
    forgot: ["Hisobingizga kirishni tiklang.", "Parolni tiklash"],
    reset: ["Yangi parol. Yangi himoya.", "Yangi parol o‘rnatish"],
    invite: ["Jamoangizga qo‘shiling.", "Taklifnomani qabul qilish"],
  };
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Brand />
        <div className="auth-story-content">
          <div className="eyebrow">
            <span className="live-dot" /> UZLUKSIZLIK UCHUN YAGONA MAKON
          </div>
          <h1>{titles[mode][0]}</h1>
          <p>
            Risklarni oldindan ko‘ring. Muhim jarayonlarni bog‘lang.
            Uzilishlarga tayyor jamoa yarating.
          </p>
          <div className="resilience-visual" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="visual-center">UzHi</span>
            <span className="visual-label label-one">Jarayonlar</span>
            <span className="visual-label label-two">Risklar</span>
            <span className="visual-label label-three">Tiklanish</span>
          </div>
          <div className="auth-pill-row">
            <span>ISO 22301 tamoyillari</span>
            <span>Tashkilot bo‘yicha himoya</span>
          </div>
        </div>
        <p className="muted small">
          Uzluksiz Himoya · Biznesingiz davom etishi uchun
        </p>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-card">
          <span className="eyebrow">UZLUKSIZ HIMOYA PLATFORMASI</span>
          <h2>
            {sent
              ? "Elektron pochtangizni tekshiring"
              : done
                ? "Parol saqlandi"
                : titles[mode][1]}
          </h2>
          <p className="muted">
            {sent
              ? "Hisobga mos manzil mavjud bo‘lsa, tiklash havolasi yuboriladi."
              : done
                ? "Endi yangi parolingiz bilan tizimga kirishingiz mumkin."
                : mode === "login"
                  ? "Davom etish uchun login va parolingizni kiriting."
                  : "Xavfsiz havola orqali hisobingizni tiklang."}
          </p>
          {(oauthError || query.has("error") || error) && (
            <div className="alert error" role="alert">
              {error ||
                oauthError ||
                "Google orqali kirish tugallanmadi. Rozilik, hisob ruxsati yoki havolani tekshirib qayta urinib ko‘ring."}
              {mode === "reset" && (
                <button className="btn" onClick={() => change("forgot")}>
                  Yangi havola olish
                </button>
              )}
            </div>
          )}
          {!sent && !done && (
            <form onSubmit={submit} className="form-stack">
              {mode === "login" && (
                <label className="field">
                  Login
                  <input
                    name="username"
                    autoComplete="username"
                    required
                    autoFocus
                    placeholder="Foydalanuvchi nomingiz"
                  />
                </label>
              )}
              {mode === "forgot" && (
                <label className="field">
                  Elektron pochta
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    placeholder="ism@tashkilot.uz"
                  />
                </label>
              )}
              {mode === "invite" && (
                <label className="field">
                  Login
                  <input name="username" autoComplete="username" required />
                </label>
              )}
              {mode !== "forgot" && (
                <Password
                  name={mode === "login" ? "password" : "new_password"}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
              )}
              {(mode === "reset" || mode === "invite") && (
                <Password
                  name="confirm_password"
                  label="Parolni tasdiqlang"
                  autoComplete="new-password"
                />
              )}
              {mode === "login" && (
                <button
                  className="text-button forgot-link"
                  type="button"
                  onClick={() => change("forgot")}
                >
                  Parolni unutdingizmi?
                </button>
              )}
              <button
                className="btn btn-primary btn-wide"
                disabled={
                  busy ||
                  (mode === "forgot" &&
                    config &&
                    !config.password_reset_enabled)
                }
              >
                {busy
                  ? "Bajarilmoqda…"
                  : mode === "login"
                    ? "Tizimga kirish"
                    : mode === "forgot"
                      ? "Tiklash havolasini yuborish"
                      : "Parolni saqlash"}
                <ArrowRight size={17} />
              </button>
            </form>
          )}
          {sent || done ? (
            <>
              <CheckCircle2 size={34} className="success-icon" />
              <button className="btn btn-wide" onClick={() => change("login")}>
                Kirish sahifasiga qaytish
              </button>
            </>
          ) : mode === "login" ? (
            <>
              <div className="divider">
                <span>yoki</span>
              </div>
              <a
                className={`btn btn-wide ${!config?.google_enabled ? "disabled" : ""}`}
                href={
                  config?.google_enabled
                    ? "/api/v1/auth/google/start"
                    : undefined
                }
                aria-disabled={!config?.google_enabled}
              >
                <span className="google-letter">G</span> Google orqali kirish
              </a>
              {config && !config.google_enabled && (
                <p className="small muted">
                  Google orqali kirish tashkilot administratori sozlagach
                  yoqiladi.
                </p>
              )}
            </>
          ) : (
            <button
              className="text-button back-link"
              onClick={() => change("login")}
            >
              <ArrowLeft size={16} /> Kirish sahifasiga qaytish
            </button>
          )}
          {mode === "forgot" && config && !config.password_reset_enabled && (
            <div className="alert">
              Email xizmati hali sozlanmagan. Hisobga kirishni tiklash uchun
              tashkilot administratoriga murojaat qiling.
            </div>
          )}
          <div className="auth-security">
            <KeyRound size={14} /> Sessiya va CSRF bilan himoyalangan
          </div>
        </div>
      </section>
    </main>
  );
}

export function AccountPage({
  user,
  onUpdate,
  onLogout,
}: {
  user: any;
  onUpdate: (u: any) => void;
  onLogout: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function save(e: FormEvent<HTMLFormElement>, password = false) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (password) {
        await api.post("/auth/password/change", data);
        clearSessionRequests();
        onLogout();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">HISOB VA XAVFSIZLIK</div>
          <h1>Shaxsiy sozlamalar</h1>
          <p className="muted">
            Profilingiz va xavfsizlik afzalliklaringizni boshqaring.
          </p>
        </div>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="alert success" role="status">
          {message}
        </div>
      )}
      <div className="grid two">
        <form
          className="panel form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const d = Object.fromEntries(new FormData(e.currentTarget));
            try {
              const result = await api.patch("/auth/me", {
                first_name: d.first_name,
                last_name: d.last_name,
                phone: d.phone,
                preferences: {
                  theme: document.documentElement.dataset.theme,
                  notifications: d.notifications === "on",
                },
              });
              onUpdate(result);
              setMessage("Profil saqlandi.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Profil ma’lumotlari</h2>
          <p className="muted">
            {user.username} · {user.role_display || user.role}
          </p>
          <label className="field">
            Ism
            <input name="first_name" defaultValue={user.first_name} />
          </label>
          <label className="field">
            Familiya
            <input name="last_name" defaultValue={user.last_name} />
          </label>
          <label className="field">
            Telefon
            <input name="phone" type="tel" defaultValue={user.phone} />
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              name="notifications"
              defaultChecked={user.preferences?.notifications !== false}
            />{" "}
            Bildirishnomalarni ko‘rsatish
          </label>
          <button className="btn btn-primary" disabled={busy}>
            Profilni saqlash
          </button>
        </form>
        <form className="panel form-stack" onSubmit={(e) => save(e, true)}>
          <h2>Hisob xavfsizligi</h2>
          <p className="muted">
            Parol yangilangach barcha eski sessiyalar tugatiladi.
          </p>
          <Password name="current_password" label="Joriy parol" />
          <Password
            name="new_password"
            label="Yangi parol"
            autoComplete="new-password"
          />
          <Password
            name="confirm_password"
            label="Yangi parolni tasdiqlang"
            autoComplete="new-password"
          />
          <button className="btn btn-primary" disabled={busy}>
            Parolni yangilash
          </button>
        </form>
        <form
          className="panel form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const d = Object.fromEntries(new FormData(e.currentTarget));
            try {
              const result = await api.post("/auth/google/link", {
                password: d.password,
              });
              window.location.assign(result.authorization_url);
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          <h2>Google hisobini bog‘lash</h2>
          <p className="muted">
            Mavjud hisobingizni parol bilan qayta tasdiqlang. Google roziligi
            keyingi sahifada olinadi.
          </p>
          <Password name="password" label="Joriy parol" />
          <button className="btn" disabled={busy}>
            Google hisobini bog‘lash
          </button>
        </form>
      </div>
    </section>
  );
}
