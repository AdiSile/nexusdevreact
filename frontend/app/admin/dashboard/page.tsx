"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import type { NexusSettings, FooterColumnLink } from "../../../lib/fallback";
import { fallbackSettings } from "../../../lib/fallback";
import ContactEditor from "./components/ContactEditor";

/* ─────────────────────────────────────────────────────────
   Dashboard Admin – Nexus Dev Studio
   Sidebar cu toate secțiunile editabile + formulare
   Salvează prin PUT /api/settings (deep merge)
   ───────────────────────────────────────────────────────── */

/* ═══════════════════════════════════════════════
   Constante
   ═══════════════════════════════════════════════ */

const AUTH_TOKEN_KEY = "nexus_admin_token";

interface SectionDef {
  id: SectionId;
  label: string;
  icon: string;
  description: string;
}

type SectionId =
  | "studio"
  | "seo"
  | "contact"
  | "footer"
  | "globalPromo";

const SECTIONS: SectionDef[] = [
  {
    id: "studio",
    label: "Studio",
    icon: "fa-building",
    description: "Nume, tagline, descriere, contact și rețele sociale",
  },
  {
    id: "seo",
    label: "SEO",
    icon: "fa-magnifying-glass",
    description: "Meta titlu, descriere, keywords, Open Graph",
  },
  {
    id: "contact",
    label: "Contact",
    icon: "fa-envelope",
    description: "Email, telefon, adresă, program și rețele sociale",
  },
  {
    id: "footer",
    label: "Footer",
    icon: "fa-section",
    description: "Copyright și coloanele de navigare din footer",
  },
  {
    id: "globalPromo",
    label: "Promo Globală",
    icon: "fa-bullhorn",
    description: "Banner promoțional, stil, acțiune și expirare",
  },
];

/* ═══════════════════════════════════════════════
   Tipuri pentru notificări toast
   ═══════════════════════════════════════════════ */

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

/* ═══════════════════════════════════════════════
   Helper: verificare token localStorage
   ═══════════════════════════════════════════════ */

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════
   Componenta Dashboard
   ═══════════════════════════════════════════════ */

export default function DashboardPage() {
  const router = useRouter();

  /* ── Auth ── */
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /* ── Settings ── */
  const [settings, setSettings] = useState<NexusSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  /* ── Secțiune activă ── */
  const [activeSection, setActiveSection] = useState<SectionId>("studio");

  /* ── Form dirty tracking ── */
  const [dirtySections, setDirtySections] = useState<Set<SectionId>>(new Set());

  /* ── Saving state ── */
  const [saving, setSaving] = useState(false);

  /* ── Toasts ── */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastCounter, setToastCounter] = useState(0);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = toastCounter;
      setToastCounter((c) => c + 1);
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    [toastCounter],
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ═══════════════════════════════════════════
     Verificare autentificare
     ═══════════════════════════════════════════ */

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      setIsAuthenticated(true);
    }
    setAuthChecked(true);
  }, []);

  /* ═══════════════════════════════════════════
     Fetch settings
     ═══════════════════════════════════════════ */

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function load() {
      setLoadingSettings(true);
      try {
        const res = await fetch("/api/settings", {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setSettings(data as NexusSettings);
      } catch (err) {
        console.warn("[dashboard] Fetch settings failed, using fallback:", err);
        if (!cancelled) setSettings(fallbackSettings);
        addToast("info", "Setările au fost încărcate din cache local.");
      } finally {
        if (!cancelled) setLoadingSettings(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, addToast]);

  /* ═══════════════════════════════════════════
     Salvare secțiune (PUT /api/settings)
     ═══════════════════════════════════════════ */

  const saveSection = useCallback(
    async (sectionId: SectionId, data: unknown) => {
      setSaving(true);
      try {
        const payload: Record<string, unknown> = {};
        payload[sectionId] = data;

        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            (errBody as { message?: string }).message || `HTTP ${res.status}`,
          );
        }

        const updated = await res.json();

        // Actualizează settings-ul local cu răspunsul serverului
        setSettings((prev) => {
          if (!prev) return prev;
          return { ...prev, ...updated } as NexusSettings;
        });

        setDirtySections((prev) => {
          const next = new Set(prev);
          next.delete(sectionId);
          return next;
        });

        const sectionLabel =
          SECTIONS.find((s) => s.id === sectionId)?.label ?? sectionId;
        addToast("success", `Secțiunea "${sectionLabel}" a fost salvată.`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Eroare necunoscută.";
        addToast("error", `Eroare la salvare: ${message}`);
      } finally {
        setSaving(false);
      }
    },
    [addToast],
  );

  /* ═══════════════════════════════════════════
     Marchează secțiunea ca dirty
     ═══════════════════════════════════════════ */

  const markDirty = useCallback((sectionId: SectionId) => {
    setDirtySections((prev) => {
      const next = new Set(prev);
      next.add(sectionId);
      return next;
    });
  }, []);

  /* ═══════════════════════════════════════════
     Render: Loading auth
     ═══════════════════════════════════════════ */

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-nexus-glow/30 border-t-nexus-glow animate-spin" />
          <p className="text-white/40 text-sm font-mono tracking-wide">
            Se verifică sesiunea...
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     Render: Neautentificat
     ═══════════════════════════════════════════ */

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass rounded-glass-lg p-8 sm:p-10 border border-glass-border max-w-md w-full text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-400/20 flex items-center justify-center mb-5">
            <i className="fa-solid fa-lock text-xl text-red-400/70" />
          </div>
          <h2 className="text-xl font-heading font-bold text-white mb-3">
            Acces restricționat
          </h2>
          <p className="text-white/45 text-sm leading-relaxed mb-6">
            Trebuie să fii autentificat pentru a accesa dashboard-ul de
            administrare.
          </p>
          <button
            onClick={() => router.push("/admin")}
            className="glass-btn text-sm px-6 py-2.5"
          >
            <i className="fa-solid fa-arrow-right-to-bracket text-xs" />
            <span>Autentificare</span>
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     Render: Loading settings
     ═══════════════════════════════════════════ */

  if (loadingSettings || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-nexus-glow/30 border-t-nexus-glow animate-spin" />
          <p className="text-white/40 text-sm font-mono tracking-wide">
            Se încarcă setările...
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     Render: Dashboard complet
     ═══════════════════════════════════════════ */

  const activeDef = SECTIONS.find((s) => s.id === activeSection)!;

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-12rem)]">
      {/* ═════════════════════════════════════════
          SIDEBAR – Secțiuni editabile
          ═════════════════════════════════════════ */}
      <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0">
        <div className="glass rounded-glass-lg border border-glass-border overflow-hidden sticky top-20">
          {/* Header sidebar */}
          <div className="px-5 py-4 border-b border-glass-border">
            <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-sliders text-nexus-glow text-xs" />
              Secțiuni editabile
            </h3>
            <p className="text-[11px] text-white/35 mt-1 font-mono">
              {SECTIONS.length} secțiuni disponibile
            </p>
          </div>

          {/* Listă secțiuni */}
          <nav className="py-2">
            {SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              const isDirty = dirtySections.has(section.id);

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`
                    w-full flex items-center gap-3 px-5 py-3 text-left transition-all duration-200 group relative
                    ${
                      isActive
                        ? "bg-nexus-accent/15 border-l-2 border-nexus-glow text-white"
                        : "text-white/50 hover:text-white/80 hover:bg-white/[0.03] border-l-2 border-transparent"
                    }
                  `}
                >
                  <span
                    className={`
                      w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm
                      transition-all duration-200
                      ${
                        isActive
                          ? "bg-nexus-accent/20 border border-nexus-accent/30 text-nexus-glow"
                          : "bg-white/5 border border-white/8 text-white/35 group-hover:text-white/60"
                      }
                    `}
                  >
                    <i className={`fa-solid ${section.icon}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium block truncate">
                      {section.label}
                    </span>
                    <span className="text-[10px] text-white/25 block truncate font-mono">
                      {section.description}
                    </span>
                  </div>
                  {isDirty && (
                    <span className="w-2 h-2 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.5)] flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* ═════════════════════════════════════════
          FORMULAR – Secțiunea activă
          ═════════════════════════════════════════ */}
      <main className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Header secțiune */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-nexus-accent/15 border border-nexus-accent/25 flex items-center justify-center flex-shrink-0">
                <i
                  className={`fa-solid ${activeDef.icon} text-nexus-glow text-sm`}
                />
              </div>
              <div>
                <h2 className="text-xl font-heading font-bold text-white">
                  {activeDef.label}
                </h2>
                <p className="text-xs text-white/35 font-mono">
                  {activeDef.description}
                </p>
              </div>
            </div>

            {/* Card formular */}
            <div className="glass rounded-glass-lg border border-glass-border overflow-hidden">
              {/* Highlight decorativ */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              <div className="p-5 sm:p-6 lg:p-8">
                {activeSection === "studio" && (
                  <StudioForm
                    data={settings.studio}
                    onSave={(data) => saveSection("studio", data)}
                    onDirty={() => markDirty("studio")}
                    saving={saving}
                  />
                )}

                {activeSection === "seo" && (
                  <SeoForm
                    data={settings.seo}
                    onSave={(data) => saveSection("seo", data)}
                    onDirty={() => markDirty("seo")}
                    saving={saving}
                  />
                )}

                {activeSection === "contact" && (
                  <ContactEditor
                    data={settings.contact}
                    social={settings.studio.social}
                    onSave={(contactData, socialData) => {
                      saveSection("contact", contactData);
                      if (socialData) {
                        // Actualizează și social media în secțiunea studio
                        saveSection("studio", {
                          ...settings.studio,
                          social: socialData,
                        });
                      }
                    }}
                    onDirty={() => markDirty("contact")}
                    saving={saving}
                  />
                )}

                {activeSection === "footer" && (
                  <FooterForm
                    data={settings.footer}
                    onSave={(data) => saveSection("footer", data)}
                    onDirty={() => markDirty("footer")}
                    saving={saving}
                  />
                )}

                {activeSection === "globalPromo" && (
                  <PromoForm
                    data={settings.globalPromo}
                    onSave={(data) => saveSection("globalPromo", data)}
                    onDirty={() => markDirty("globalPromo")}
                    saving={saving}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ═════════════════════════════════════════
          TOAST NOTIFICATIONS
          ═════════════════════════════════════════ */}
      <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="pointer-events-auto"
            >
              <div
                className={`
                  flex items-start gap-3 px-4 py-3 rounded-glass border shadow-glass-lg backdrop-blur-xl
                  ${
                    toast.type === "success"
                      ? "bg-green-500/15 border-green-400/25 text-green-300"
                      : toast.type === "error"
                        ? "bg-red-500/15 border-red-400/25 text-red-300"
                        : "bg-nexus-accent/15 border-nexus-accent/25 text-nexus-glow"
                  }
                `}
              >
                <i
                  className={`fa-solid mt-0.5 text-sm flex-shrink-0 ${
                    toast.type === "success"
                      ? "fa-circle-check"
                      : toast.type === "error"
                        ? "fa-circle-exclamation"
                        : "fa-circle-info"
                  }`}
                />
                <p className="text-sm leading-relaxed pr-6">{toast.message}</p>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center text-current/50 hover:text-current transition-colors"
                >
                  <i className="fa-solid fa-xmark text-[10px]" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Formular: STUDIO
   ═══════════════════════════════════════════════ */

interface StudioFormData {
  name: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  founded: number;
  heroVideoUrl: string;
  heroPosterUrl: string;
  cvUrl: string;
  social: {
    github: string;
    linkedin: string;
    twitter: string;
    instagram: string;
  };
}

function StudioForm({
  data,
  onSave,
  onDirty,
  saving,
}: {
  data: NexusSettings["studio"];
  onSave: (data: NexusSettings["studio"]) => void;
  onDirty: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<StudioFormData>({ ...data, social: { ...data.social } });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync external data changes
  useEffect(() => {
    setForm({ ...data, social: { ...data.social } });
    setErrors({});
  }, [data]);

  const update = useCallback(
    (field: string, value: string | number) => {
      setForm((prev) => ({ ...prev, [field]: value } as StudioFormData));
      onDirty();
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [onDirty],
  );

  const updateSocial = useCallback(
    (platform: string, value: string) => {
      setForm((prev) => ({
        ...prev,
        social: { ...prev.social, [platform]: value } as StudioFormData["social"],
      }));
      onDirty();
    },
    [onDirty],
  );

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs['name'] = "Numele studioului este obligatoriu.";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errs['email'] = "Adresa de email este invalidă.";
    if (!form.tagline.trim()) errs['tagline'] = "Tagline-ul este obligatoriu.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, social: { ...form.social }, founded: Number(form.founded) || 2023 });
  };

  const inputClass = (field: string) =>
    `w-full bg-white/[0.04] border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 outline-none transition-all duration-200 ${
      errors[field]
        ? "border-red-400/60 focus:border-red-400/70 focus:ring-1 focus:ring-red-400/20"
        : "border-glass-border focus:border-nexus-glow/40 focus:ring-1 focus:ring-nexus-glow/10 hover:border-glass-border-strong"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identitate */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
          Identitate
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nume Studio" field="s-name" error={errors['name']}>
            <input
              id="s-name"
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Nexus Dev Studio"
              className={inputClass("name")}
            />
          </Field>
          <Field label="An fondare" field="s-founded" error={undefined}>
            <input
              id="s-founded"
              type="number"
              value={form.founded}
              onChange={(e) => update("founded", e.target.value)}
              placeholder="2023"
              className={inputClass("founded")}
            />
          </Field>
        </div>
        <Field label="Tagline" field="s-tagline" error={errors['tagline']}>
          <input
            id="s-tagline"
            type="text"
            value={form.tagline}
            onChange={(e) => update("tagline", e.target.value)}
            placeholder="Transformăm idei în realitate digitală."
            className={inputClass("tagline")}
          />
        </Field>
        <Field label="Descriere" field="s-desc" error={undefined}>
          <textarea
            id="s-desc"
            rows={3}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Descrierea studioului..."
            className={inputClass("description")}
          />
        </Field>
      </fieldset>

      {/* Contact */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
          Contact
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email" field="s-email" error={errors['email']}>
            <input
              id="s-email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="contact@nexusdevstudio.ro"
              className={inputClass("email")}
            />
          </Field>
          <Field label="Telefon" field="s-phone" error={undefined}>
            <input
              id="s-phone"
              type="text"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+40 723 456 789"
              className={inputClass("phone")}
            />
          </Field>
        </div>
        <Field label="Adresă" field="s-address" error={undefined}>
          <input
            id="s-address"
            type="text"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="București, România"
            className={inputClass("address")}
          />
        </Field>
      </fieldset>

      {/* Media */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
          Media
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Hero Video URL" field="s-hero-video" error={undefined}>
            <input
              id="s-hero-video"
              type="text"
              value={form.heroVideoUrl}
              onChange={(e) => update("heroVideoUrl", e.target.value)}
              placeholder="/video/hero-bg.mp4"
              className={inputClass("heroVideoUrl")}
            />
          </Field>
          <Field label="Hero Poster URL" field="s-hero-poster" error={undefined}>
            <input
              id="s-hero-poster"
              type="text"
              value={form.heroPosterUrl}
              onChange={(e) => update("heroPosterUrl", e.target.value)}
              placeholder="/images/hero-poster.jpg"
              className={inputClass("heroPosterUrl")}
            />
          </Field>
        </div>
        <Field label="CV URL" field="s-cv" error={undefined}>
          <input
            id="s-cv"
            type="text"
            value={form.cvUrl}
            onChange={(e) => update("cvUrl", e.target.value)}
            placeholder="/files/cv.pdf"
            className={inputClass("cvUrl")}
          />
        </Field>
      </fieldset>

      {/* Social */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
          Rețele sociale
        </legend>
        {(["github", "linkedin", "twitter", "instagram"] as const).map((p) => (
          <Field key={p} label={p.charAt(0).toUpperCase() + p.slice(1)} field={`s-social-${p}`} error={undefined}>
            <input
              id={`s-social-${p}`}
              type="url"
              value={form.social[p]}
              onChange={(e) => updateSocial(p, e.target.value)}
              placeholder={`https://${p}.com/nexusdevstudio`}
              className={inputClass(`social-${p}`)}
            />
          </Field>
        ))}
      </fieldset>

      <SubmitButton saving={saving} />
    </form>
  );
}

/* ═══════════════════════════════════════════════
   Formular: SEO
   ═══════════════════════════════════════════════ */

interface SeoFormData {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  siteUrl: string;
  language: string;
  twitterHandle: string;
}

function SeoForm({
  data,
  onSave,
  onDirty,
  saving,
}: {
  data: NexusSettings["seo"];
  onSave: (data: NexusSettings["seo"]) => void;
  onDirty: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<SeoFormData>({ ...data });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm({ ...data });
    setErrors({});
  }, [data]);

  const update = useCallback(
    (field: string, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value } as SeoFormData));
      onDirty();
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [onDirty],
  );

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs['title'] = "Titlul SEO este obligatoriu.";
    if (!form.description.trim()) errs['description'] = "Descrierea SEO este obligatorie.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(form);
  };

  const inputClass = (field: string) =>
    `w-full bg-white/[0.04] border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 outline-none transition-all duration-200 ${
      errors[field]
        ? "border-red-400/60 focus:border-red-400/70 focus:ring-1 focus:ring-red-400/20"
        : "border-glass-border focus:border-nexus-glow/40 focus:ring-1 focus:ring-nexus-glow/10 hover:border-glass-border-strong"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="Meta Titlu" field="seo-title" error={errors['title']}>
        <input
          id="seo-title"
          type="text"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Nexus Dev Studio | Dezvoltare Web Modernă"
          className={inputClass("title")}
        />
        <CharCount current={form.title.length} max={70} />
      </Field>

      <Field label="Meta Descriere" field="seo-desc" error={errors['description']}>
        <textarea
          id="seo-desc"
          rows={3}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Descrierea pentru motoarele de căutare..."
          className={inputClass("description")}
        />
        <CharCount current={form.description.length} max={160} />
      </Field>

      <Field label="Cuvinte cheie" field="seo-kw" error={undefined}>
        <input
          id="seo-kw"
          type="text"
          value={form.keywords}
          onChange={(e) => update("keywords", e.target.value)}
          placeholder="dezvoltare web, next.js, react, full-stack"
          className={inputClass("keywords")}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="OG Image URL" field="seo-og" error={undefined}>
          <input
            id="seo-og"
            type="text"
            value={form.ogImage}
            onChange={(e) => update("ogImage", e.target.value)}
            placeholder="/images/og-image.jpg"
            className={inputClass("ogImage")}
          />
        </Field>
        <Field label="Site URL" field="seo-url" error={undefined}>
          <input
            id="seo-url"
            type="url"
            value={form.siteUrl}
            onChange={(e) => update("siteUrl", e.target.value)}
            placeholder="https://nexusdevstudio.ro"
            className={inputClass("siteUrl")}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Limbă" field="seo-lang" error={undefined}>
          <input
            id="seo-lang"
            type="text"
            value={form.language}
            onChange={(e) => update("language", e.target.value)}
            placeholder="ro"
            className={inputClass("language")}
          />
        </Field>
        <Field label="Twitter Handle" field="seo-tw" error={undefined}>
          <input
            id="seo-tw"
            type="text"
            value={form.twitterHandle}
            onChange={(e) => update("twitterHandle", e.target.value)}
            placeholder="@nexusdevstudio"
            className={inputClass("twitterHandle")}
          />
        </Field>
      </div>

      <SubmitButton saving={saving} />
    </form>
  );
}

/* ═══════════════════════════════════════════════
   Formular: FOOTER
   ═══════════════════════════════════════════════ */

interface FooterColumnMutable {
  title: string;
  links: FooterColumnLink[];
}

interface FooterFormData {
  copyright: string;
  columns: FooterColumnMutable[];
}

function FooterForm({
  data,
  onSave,
  onDirty,
  saving,
}: {
  data: NexusSettings["footer"];
  onSave: (data: NexusSettings["footer"]) => void;
  onDirty: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FooterFormData>({
    copyright: data.copyright,
    columns: data.columns.map((c) => ({
      title: c.title,
      links: c.links.map((l) => ({ ...l })),
    })),
  });

  useEffect(() => {
    setForm({
      copyright: data.copyright,
      columns: data.columns.map((c) => ({
        title: c.title,
        links: c.links.map((l) => ({ ...l })),
      })),
    });
  }, [data]);

  const updateCopyright = useCallback(
    (value: string) => {
      setForm((prev) => ({ ...prev, copyright: value }));
      onDirty();
    },
    [onDirty],
  );

  const updateColumnTitle = useCallback(
    (colIdx: number, value: string) => {
      setForm((prev) => {
        const cols = [...prev.columns];
        cols[colIdx] = { ...cols[colIdx]!, title: value };
        return { ...prev, columns: cols };
      });
      onDirty();
    },
    [onDirty],
  );

  const updateLink = useCallback(
    (colIdx: number, linkIdx: number, field: "label" | "href", value: string) => {
      setForm((prev) => {
        const cols = [...prev.columns];
        const col = cols[colIdx]!;
        const links = [...col.links];
        links[linkIdx] = { ...links[linkIdx]!, [field]: value };
        cols[colIdx] = { ...col, links };
        return { ...prev, columns: cols };
      });
      onDirty();
    },
    [onDirty],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(form as NexusSettings["footer"]);
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-glass-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 outline-none transition-all duration-200 focus:border-nexus-glow/40 focus:ring-1 focus:ring-nexus-glow/10 hover:border-glass-border-strong";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="Copyright" field="f-copyright" error={undefined}>
        <input
          id="f-copyright"
          type="text"
          value={form.copyright}
          onChange={(e) => updateCopyright(e.target.value)}
          placeholder="{year} Nexus Dev Studio. Toate drepturile rezervate."
          className={inputClass}
        />
        <p className="text-[10px] text-white/25 mt-1 font-mono">
          Folosește {"{year}"} pentru anul curent.
        </p>
      </Field>

      {/* Coloane */}
      {form.columns.map((col, colIdx) => (
        <div
          key={colIdx}
          className="p-4 rounded-glass border border-glass-border bg-white/[0.02]"
        >
          <Field label={`Coloana ${colIdx + 1} — Titlu`} field={`col-${colIdx}`} error={undefined}>
            <input
              id={`col-title-${colIdx}`}
              type="text"
              value={col.title}
              onChange={(e) => updateColumnTitle(colIdx, e.target.value)}
              placeholder="Servicii"
              className={inputClass}
            />
          </Field>

          <div className="mt-3 space-y-2">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
              Linkuri
            </p>
            {col.links.map((link, linkIdx) => (
              <div
                key={linkIdx}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              >
                <input
                  id={`col-${colIdx}-link-${linkIdx}-label`}
                  type="text"
                  value={link.label}
                  onChange={(e) =>
                    updateLink(colIdx, linkIdx, "label", e.target.value)
                  }
                  placeholder="Label link"
                  className={inputClass}
                />
                <input
                  id={`col-${colIdx}-link-${linkIdx}-href`}
                  type="text"
                  value={link.href}
                  onChange={(e) =>
                    updateLink(colIdx, linkIdx, "href", e.target.value)
                  }
                  placeholder="#services"
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <SubmitButton saving={saving} />
    </form>
  );
}

/* ═══════════════════════════════════════════════
   Formular: GLOBAL PROMO
   ═══════════════════════════════════════════════ */

type PromoStyle = "info" | "success" | "warning" | "highlight" | "gradient";

interface PromoFormData {
  text: string;
  subtext: string;
  style: PromoStyle;
  dismissible: boolean;
  isActive: boolean;
  expiresAt: string;
}

function PromoForm({
  data,
  onSave,
  onDirty,
  saving,
}: {
  data: NexusSettings["globalPromo"];
  onSave: (data: NexusSettings["globalPromo"]) => void;
  onDirty: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<PromoFormData>({
    text: data.text,
    subtext: data.subtext ?? "",
    style: data.style,
    dismissible: data.dismissible,
    isActive: data.isActive,
    expiresAt: data.expiresAt?.slice(0, 10) ?? "",
  });

  useEffect(() => {
    setForm({
      text: data.text,
      subtext: data.subtext ?? "",
      style: data.style,
      dismissible: data.dismissible,
      isActive: data.isActive,
      expiresAt: data.expiresAt?.slice(0, 10) ?? "",
    });
  }, [data]);

  const update = useCallback(
    (field: string, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value } as PromoFormData));
      onDirty();
    },
    [onDirty],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      ...data,
      text: form.text,
      subtext: form.subtext || undefined,
      style: form.style,
      dismissible: form.dismissible,
      isActive: form.isActive,
      expiresAt: form.expiresAt
        ? new Date(form.expiresAt).toISOString()
        : undefined,
    } as NexusSettings["globalPromo"]);
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-glass-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 outline-none transition-all duration-200 focus:border-nexus-glow/40 focus:ring-1 focus:ring-nexus-glow/10 hover:border-glass-border-strong";

  const PROMO_STYLES: { value: PromoStyle; label: string; color: string }[] = [
    { value: "info", label: "Info", color: "bg-blue-500/30 border-blue-400/40" },
    { value: "success", label: "Succes", color: "bg-green-500/30 border-green-400/40" },
    { value: "warning", label: "Avertisment", color: "bg-amber-500/30 border-amber-400/40" },
    { value: "highlight", label: "Evidențiat", color: "bg-purple-500/30 border-purple-400/40" },
    { value: "gradient", label: "Gradient", color: "bg-gradient-to-r from-nexus-accent/30 to-gold/30 border-nexus-glow/40" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="Text promo" field="p-text" error={undefined}>
        <input
          id="p-text"
          type="text"
          value={form.text}
          onChange={(e) => update("text", e.target.value)}
          placeholder="Reduceri de lansare disponibile!"
          className={inputClass}
        />
      </Field>

      <Field label="Subtext (opțional)" field="p-sub" error={undefined}>
        <input
          id="p-sub"
          type="text"
          value={form.subtext}
          onChange={(e) => update("subtext", e.target.value)}
          placeholder="Subtext promoțional..."
          className={inputClass}
        />
      </Field>

      {/* Stil */}
      <fieldset>
        <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
          Stil
        </legend>
        <div className="flex flex-wrap gap-2">
          {PROMO_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => update("style", s.value)}
              className={`
                px-4 py-2 rounded-full text-xs font-medium border transition-all duration-200
                ${
                  form.style === s.value
                    ? `${s.color} text-white shadow-lg`
                    : "bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
                }
              `}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Switch-uri */}
      <div className="flex flex-wrap gap-6">
        <ToggleField
          label="Activă"
          checked={form.isActive}
          onChange={(v) => update("isActive", v)}
        />
        <ToggleField
          label="Se poate închide"
          checked={form.dismissible}
          onChange={(v) => update("dismissible", v)}
        />
      </div>

      <Field label="Data expirării" field="p-expires" error={undefined}>
        <input
          id="p-expires"
          type="date"
          value={form.expiresAt}
          onChange={(e) => update("expiresAt", e.target.value)}
          className={inputClass}
        />
      </Field>

      <SubmitButton saving={saving} />
    </form>
  );
}

/* ═══════════════════════════════════════════════
   Componente utilitare mici
   ═══════════════════════════════════════════════ */

/** Label + input wrapper */
function Field({
  label,
  field,
  error,
  children,
}: {
  label: string;
  field: string;
  error: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={field}
        className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider"
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-red-400/80 flex items-center gap-1.5">
          <i className="fa-solid fa-circle-exclamation text-[10px]" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Contor de caractere */
function CharCount({ current, max }: { current: number; max: number }) {
  const isOver = current > max;
  return (
    <p
      className={`text-[10px] mt-1 font-mono text-right ${
        isOver ? "text-red-400/70" : "text-white/25"
      }`}
    >
      {current}/{max}
      {isOver && " — prea lung"}
    </p>
  );
}

/** Toggle switch */
function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 group"
    >
      <div
        className={`
          w-10 h-5 rounded-full relative transition-all duration-300
          ${checked ? "bg-nexus-accent/70 shadow-[0_0_10px_rgba(108,60,225,0.3)]" : "bg-white/10"}
        `}
      >
        <div
          className={`
            absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300
            ${checked ? "left-[22px]" : "left-0.5"}
          `}
        />
      </div>
      <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">
        {label}
      </span>
    </button>
  );
}

/** Buton submit cu stare de loading */
function SubmitButton({ saving }: { saving: boolean }) {
  return (
    <div className="flex items-center gap-3 pt-4 border-t border-glass-border">
      <button
        type="submit"
        disabled={saving}
        className="
          glass-btn text-sm px-6 py-2.5
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {saving ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
            <span>Se salvează...</span>
          </>
        ) : (
          <>
            <i className="fa-solid fa-floppy-disk text-xs" />
            <span>Salvează modificările</span>
          </>
        )}
      </button>

      {!saving && (
        <span className="text-[11px] text-white/20 font-mono">
          Se trimite PUT /api/settings
        </span>
      )}
    </div>
  );
}