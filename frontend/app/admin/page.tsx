"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";

/* ─────────────────────────────────────────────────────────
   Admin Page – Nexus Dev Studio
   - Verifică autentificarea (token în localStorage)
   - Dacă NU e autentificat → formular login glassmorphism
   - Dacă e autentificat → dashboard complet
   ───────────────────────────────────────────────────────── */

/* ═══════════════════════════════════════════════
   Constante
   ═══════════════════════════════════════════════ */

const AUTH_TOKEN_KEY = "nexus_admin_token";
const AUTH_CHECK_EVENT = "nexus:auth-changed";

/* ═══════════════════════════════════════════════
   Tipuri
   ═══════════════════════════════════════════════ */

type AuthState = "checking" | "authenticated" | "unauthenticated";

interface LoginFormState {
  email: string;
  password: string;
}

interface LoginError {
  message: string;
  field?: "email" | "password" | "general";
}

/* ═══════════════════════════════════════════════
   Helper: gestionare token
   ═══════════════════════════════════════════════ */

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    // Dispatch event pentru sincronizare cross-tab
    window.dispatchEvent(new Event(AUTH_CHECK_EVENT));
  } catch {
    // localStorage indisponibil (private browsing etc.)
    console.warn("[admin] localStorage indisponibil — token-ul nu a fost salvat.");
  }
}

function removeToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    window.dispatchEvent(new Event(AUTH_CHECK_EVENT));
  } catch {
    // nimic
  }
}

/* ═══════════════════════════════════════════════
   Componenta principală: AdminPage
   ═══════════════════════════════════════════════ */

export default function AdminPage() {
  /* ── Stare autentificare ── */
  const [authState, setAuthState] = useState<AuthState>("checking");

  /* ── Stare formular login ── */
  const [form, setForm] = useState<LoginFormState>({ email: "", password: "" });
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /* ── Verificare token la montare ── */
  useEffect(() => {
    const token = getStoredToken();
    setAuthState(token ? "authenticated" : "unauthenticated");

    // Ascultă evenimentul de schimbare auth (cross-tab / logout din alt tab)
    const handleAuthChange = () => {
      const t = getStoredToken();
      setAuthState(t ? "authenticated" : "unauthenticated");
    };
    window.addEventListener(AUTH_CHECK_EVENT, handleAuthChange);
    return () => window.removeEventListener(AUTH_CHECK_EVENT, handleAuthChange);
  }, []);

  /* ── Handlers formular ── */
  const handleFieldChange = useCallback(
    (field: keyof LoginFormState) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (loginError?.field === field || loginError?.field === "general") {
          setLoginError(null);
        }
      },
    [loginError],
  );

  const handleLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Validare client-side
      if (!form.email.trim()) {
        setLoginError({ message: "Te rugăm să introduci adresa de email.", field: "email" });
        return;
      }
      if (!form.password) {
        setLoginError({ message: "Te rugăm să introduci parola.", field: "password" });
        return;
      }

      setIsSubmitting(true);
      setLoginError(null);

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setLoginError({
            message: data.message || data.error || "Email sau parolă incorecte.",
            field: "general",
          });
          return;
        }

        // Salvează token-ul și actualizează starea
        if (data.token) {
          storeToken(data.token);
        }
        setAuthState("authenticated");

        // Curăță formularul
        setForm({ email: "", password: "" });
      } catch (err: unknown) {
        setLoginError({
          message:
            err instanceof Error
              ? err.message
              : "Eroare de rețea. Verifică conexiunea și încearcă din nou.",
          field: "general",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [form],
  );

  const handleLogout = useCallback(() => {
    removeToken();
    setAuthState("unauthenticated");
    setForm({ email: "", password: "" });
    setLoginError(null);
  }, []);

  /* ═══════════════════════════════════════════════
     RENDER: Stare de verificare (loading)
     ═══════════════════════════════════════════════ */

  if (authState === "checking") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner glassmorphism */}
          <div className="w-10 h-10 rounded-full border-2 border-nexus-glow/30 border-t-nexus-glow animate-spin" />
          <p className="text-white/40 text-sm font-mono tracking-wide">
            Se verifică sesiunea...
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════
     RENDER: Formular Login (neautentificat)
     ═══════════════════════════════════════════════ */

  if (authState === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] px-4">
        <div className="w-full max-w-md">
          {/* Card login glassmorphism */}
          <div className="glass rounded-glass-xl p-8 sm:p-10 border border-glass-border relative overflow-hidden">
            {/* Highlight decorativ top */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Fundal decorativ */}
            <div
              aria-hidden="true"
              className="absolute -top-20 -right-20 w-48 h-48 pointer-events-none opacity-[0.07]"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(108,60,225,0.8) 0%, transparent 70%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-16 -left-16 w-40 h-40 pointer-events-none opacity-[0.05]"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(212,175,55,0.7) 0%, transparent 70%)",
              }}
            />

            <div className="relative z-10">
              {/* Icon și titlu */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-nexus-accent/15 border border-nexus-accent/25 mb-5 shadow-[0_0_24px_rgba(108,60,225,0.15)]">
                  <i className="fa-solid fa-shield-halved text-xl text-nexus-glow" />
                </div>
                <h1 className="text-2xl font-heading font-bold text-white mb-2">
                  Nexus Admin
                </h1>
                <p className="text-white/45 text-sm leading-relaxed">
                  Autentifică-te pentru a accesa panoul de administrare.
                </p>
              </div>

              {/* Formular */}
              <form onSubmit={handleLogin} noValidate className="space-y-5">
                {/* Email */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider"
                  >
                    Email
                  </label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 text-sm group-focus-within:text-nexus-glow/60 transition-colors duration-200">
                      <i className="fa-solid fa-envelope" />
                    </span>
                    <input
                      id="login-email"
                      type="email"
                      value={form.email}
                      onChange={handleFieldChange("email")}
                      placeholder="admin@nexusdev.studio"
                      autoComplete="email"
                      autoFocus
                      disabled={isSubmitting}
                      className={`
                        w-full pl-10 pr-4 py-3 bg-white/[0.04] border rounded-xl
                        text-white text-sm placeholder:text-white/20
                        outline-none transition-all duration-200
                        ${
                          loginError?.field === "email"
                            ? "border-red-400/60 focus:border-red-400/70 focus:ring-1 focus:ring-red-400/20"
                            : "border-glass-border focus:border-nexus-glow/40 focus:ring-1 focus:ring-nexus-glow/10 hover:border-glass-border-strong"
                        }
                      `}
                    />
                  </div>
                  {loginError?.field === "email" && (
                    <p className="mt-1.5 text-xs text-red-400/80 flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-exclamation text-[10px]" />
                      {loginError.message}
                    </p>
                  )}
                </div>

                {/* Parolă */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-medium text-white/50 uppercase tracking-wider"
                    >
                      Parolă
                    </label>
                    <button
                      type="button"
                      tabIndex={-1}
                      className="text-[11px] text-white/30 hover:text-white/60 transition-colors duration-200"
                    >
                      Ai uitat parola?
                    </button>
                  </div>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 text-sm group-focus-within:text-nexus-glow/60 transition-colors duration-200">
                      <i className="fa-solid fa-lock" />
                    </span>
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handleFieldChange("password")}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      className={`
                        w-full pl-10 pr-11 py-3 bg-white/[0.04] border rounded-xl
                        text-white text-sm placeholder:text-white/20
                        outline-none transition-all duration-200
                        ${
                          loginError?.field === "password"
                            ? "border-red-400/60 focus:border-red-400/70 focus:ring-1 focus:ring-red-400/20"
                            : "border-glass-border focus:border-nexus-glow/40 focus:ring-1 focus:ring-nexus-glow/10 hover:border-glass-border-strong"
                        }
                      `}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors duration-200"
                      aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
                    >
                      <i
                        className={`fa-solid text-xs ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                      />
                    </button>
                  </div>
                  {loginError?.field === "password" && (
                    <p className="mt-1.5 text-xs text-red-400/80 flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-exclamation text-[10px]" />
                      {loginError.message}
                    </p>
                  )}
                </div>

                {/* Eroare generală */}
                {loginError?.field === "general" && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/8 border border-red-400/20">
                    <i className="fa-solid fa-triangle-exclamation text-xs text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-400/90 leading-relaxed">
                      {loginError.message}
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="
                    w-full py-3 rounded-xl font-semibold text-sm
                    bg-nexus-accent/80 hover:bg-nexus-accent
                    text-white border border-nexus-accent/40 hover:border-nexus-glow/50
                    shadow-[0_0_20px_rgba(108,60,225,0.2)] hover:shadow-[0_0_28px_rgba(108,60,225,0.35)]
                    transition-all duration-300
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2
                  "
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                      <span>Se autentifică...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-arrow-right-to-bracket text-xs" />
                      <span>Autentificare</span>
                    </>
                  )}
                </button>
              </form>

              {/* Link înapoi la site */}
              <div className="mt-6 pt-5 border-t border-glass-border text-center">
                <a
                  href="/"
                  className="text-xs text-white/35 hover:text-white/65 transition-colors duration-200 inline-flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-arrow-left text-[10px]" />
                  <span>Înapoi la site</span>
                </a>
              </div>
            </div>
          </div>

          {/* Text subtil sub card */}
          <p className="text-center text-[11px] text-white/20 mt-6 font-mono tracking-wide">
            Nexus Dev Studio &copy; {new Date().getFullYear()} — Panou Administrare
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════
     RENDER: Dashboard (autentificat)
     ═══════════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-white/50 text-sm font-mono tracking-wide">
            Bine ai revenit,
          </p>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mt-1">
            Dashboard
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-btn text-sm px-4 py-2.5 inline-flex items-center gap-2 self-start"
          >
            <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
            <span>Vezi site-ul</span>
          </a>

          {/* Buton Logout */}
          <button
            onClick={handleLogout}
            className="glass-btn text-sm px-4 py-2.5 inline-flex items-center gap-2 self-start text-red-400/70 hover:text-red-400 border-red-400/15 hover:border-red-400/30"
          >
            <i className="fa-solid fa-right-from-bracket text-xs" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Grid statistici */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Servicii active", value: "21", icon: "fa-cubes", color: "text-nexus-glow" },
          { label: "Proiecte portofoliu", value: "6", icon: "fa-briefcase", color: "text-gold-light" },
          { label: "Întrebări FAQ", value: "6", icon: "fa-circle-question", color: "text-nexus-glow" },
          { label: "Etape proces", value: "5", icon: "fa-diagram-project", color: "text-gold-light" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-light rounded-glass p-5 border border-glass-border flex items-center gap-4 hover:border-glass-border-strong transition-all duration-300 group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0 group-hover:border-white/15 transition-all duration-300">
              <i className={`fa-solid ${stat.icon} ${stat.color} text-sm`} />
            </div>
            <div>
              <p className="text-2xl font-extrabold font-heading text-white">
                {stat.value}
              </p>
              <p className="text-xs text-white/40 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mesaj de bun venit */}
      <div className="glass rounded-glass-lg p-6 sm:p-8 border border-glass-border relative overflow-hidden">
        {/* Highlight decorativ */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative z-10">
          <h3 className="text-lg sm:text-xl font-heading font-bold text-white mb-3">
            Panou de administrare
          </h3>
          <p className="text-white/50 text-sm sm:text-base leading-relaxed max-w-2xl">
            Gestionează conținutul site-ului Nexus Dev Studio din acest panou. 
            Poți modifica serviciile, actualiza portofoliul, edita pașii procesului,
            administra FAQ-urile și personaliza setările de contact.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { label: "Servicii", href: "/admin/services", icon: "fa-cubes" },
              { label: "Portofoliu", href: "/admin/portfolio", icon: "fa-briefcase" },
              { label: "Setări", href: "/admin/settings", icon: "fa-gear" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="glass-btn text-xs sm:text-sm px-4 py-2.5 inline-flex items-center gap-2"
              >
                <i className={`fa-solid ${link.icon} text-xs`} />
                <span>{link.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Fundal decorativ */}
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-10"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(108,60,225,0.4) 0%, transparent 70%)",
          }}
        />
      </div>
    </div>
  );
}