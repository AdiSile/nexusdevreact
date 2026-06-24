"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StudioFallback } from "../../../../lib/fallback";

/* ═══════════════════════════════════════════════════════════════════════════
   HeroEditor – Editor vizual pentru secțiunea Hero și setări generale
   Oferă previzualizare live, validare avansată și urmărire modificări.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────
   Tipuri
   ───────────────────────────────────────────────────────── */

type SocialPlatform = "github" | "linkedin" | "twitter" | "instagram";

interface HeroFormData {
  name: string;
  tagline: string;
  description: string;
  founded: number;
  heroVideoUrl: string;
  heroPosterUrl: string;
  cvUrl: string;
  social: Record<SocialPlatform, string>;
}

interface FormErrors {
  [field: string]: string;
}

type PreviewMode = "desktop" | "mobile";

interface ChangeLogEntry {
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: number;
}

/* ─────────────────────────────────────────────────────────
   Constante
   ───────────────────────────────────────────────────────── */

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  twitter: "Twitter / X",
  instagram: "Instagram",
};

const PLATFORM_ICONS: Record<SocialPlatform, string> = {
  github: "fa-github",
  linkedin: "fa-linkedin",
  twitter: "fa-x-twitter",
  instagram: "fa-instagram",
};

const PLATFORM_PLACEHOLDERS: Record<SocialPlatform, string> = {
  github: "https://github.com/nexusdevstudio",
  linkedin: "https://linkedin.com/in/nexusdevstudio",
  twitter: "https://twitter.com/nexusdevstudio",
  instagram: "https://instagram.com/nexusdevstudio",
};

/* ─────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────── */

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function hasUrlChanged(oldUrl: string, newUrl: string): boolean {
  return oldUrl.trim() !== newUrl.trim();
}

/* ═════════════════════════════════════════════════════════
   Componenta principală
   ═════════════════════════════════════════════════════════ */

export interface HeroEditorProps {
  /** Datele curente ale studioului */
  data: StudioFallback;
  /** Callback salvare */
  onSave: (data: StudioFallback) => void;
  /** Callback dirty */
  onDirty: () => void;
  /** Stare salvare */
  saving: boolean;
}

export default function HeroEditor({
  data,
  onSave,
  onDirty,
  saving,
}: HeroEditorProps) {
  /* ── Stare formular ── */
  const [form, setForm] = useState<HeroFormData>(() => ({
    name: data.name,
    tagline: data.tagline,
    description: data.description,
    founded: data.founded,
    heroVideoUrl: data.heroVideoUrl,
    heroPosterUrl: data.heroPosterUrl,
    cvUrl: data.cvUrl,
    social: { ...data.social },
  }));

  const [errors, setErrors] = useState<FormErrors>({});
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [videoError, setVideoError] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [showChanges, setShowChanges] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  /* ── Sincronizare date externe ── */
  useEffect(() => {
    setForm({
      name: data.name,
      tagline: data.tagline,
      description: data.description,
      founded: data.founded,
      heroVideoUrl: data.heroVideoUrl,
      heroPosterUrl: data.heroPosterUrl,
      cvUrl: data.cvUrl,
      social: { ...data.social },
    });
    setErrors({});
    setVideoError(false);
    setPosterError(false);
  }, [data]);

  /* ── Focus primul input la montare ── */
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  /* ── Reset preview states când se schimbă URL-urile media ── */
  useEffect(() => {
    setVideoError(false);
    setPosterError(false);
  }, [form.heroVideoUrl, form.heroPosterUrl]);

  /* ── Actualizare câmp generic ── */
  const update = useCallback(
    (field: string, value: string | number) => {
      setForm((prev) => {
        const oldValue = String(prev[field as keyof HeroFormData] ?? "");
        const newValue = String(value);
        if (oldValue !== newValue) {
          setChangeLog((log) => [
            { field, oldValue, newValue, timestamp: Date.now() },
            ...log.slice(0, 49), // păstrează max 50 intrări
          ]);
        }
        return { ...prev, [field]: value };
      });
      onDirty();
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [onDirty],
  );

  /* ── Actualizare social ── */
  const updateSocial = useCallback(
    (platform: SocialPlatform, value: string) => {
      setForm((prev) => {
        const oldVal = prev.social[platform];
        if (oldVal !== value) {
          setChangeLog((log) => [
            {
              field: `social.${platform}`,
              oldValue: oldVal,
              newValue: value,
              timestamp: Date.now(),
            },
            ...log.slice(0, 49),
          ]);
        }
        return {
          ...prev,
          social: { ...prev.social, [platform]: value },
        };
      });
      onDirty();
    },
    [onDirty],
  );

  /* ── Validare ── */
  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};

    if (!form.name.trim()) {
      errs.name = "Numele studioului este obligatoriu.";
    } else if (form.name.trim().length < 2) {
      errs.name = "Numele trebuie să aibă cel puțin 2 caractere.";
    }

    if (!form.tagline.trim()) {
      errs.tagline = "Tagline-ul este obligatoriu.";
    } else if (form.tagline.trim().length < 5) {
      errs.tagline = "Tagline-ul trebuie să aibă cel puțin 5 caractere.";
    }

    if (!form.description.trim()) {
      errs.description = "Descrierea este obligatorie.";
    } else if (form.description.trim().length < 20) {
      errs.description = "Descrierea trebuie să aibă cel puțin 20 de caractere.";
    }

    if (!form.heroPosterUrl.trim()) {
      errs.heroPosterUrl = "URL-ul pentru poster este obligatoriu.";
    }

    // Validare URL-uri social (doar dacă au conținut)
    const urlPattern = /^https?:\/\/.+/i;
    (Object.keys(PLATFORM_LABELS) as SocialPlatform[]).forEach((p) => {
      const val = form.social[p].trim();
      if (val && !urlPattern.test(val)) {
        errs[`social.${p}`] = "URL invalid (trebuie să înceapă cu http(s)://).";
      }
    });

    if (form.heroVideoUrl.trim() && !urlPattern.test(form.heroVideoUrl.trim()) && !form.heroVideoUrl.trim().startsWith("/")) {
      errs.heroVideoUrl = "URL invalid. Folosește o cale relativă (ex: /video/hero.mp4) sau un URL complet.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  /* ── Submit ── */
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      const cleaned: StudioFallback = {
        name: form.name.trim(),
        tagline: form.tagline.trim(),
        description: form.description.trim(),
        founded: Number(form.founded) || new Date().getFullYear(),
        heroVideoUrl: form.heroVideoUrl.trim(),
        heroPosterUrl: form.heroPosterUrl.trim(),
        cvUrl: form.cvUrl.trim(),
        email: data.email,
        phone: data.phone,
        address: data.address,
        social: {
          github: form.social.github.trim(),
          linkedin: form.social.linkedin.trim(),
          twitter: form.social.twitter.trim(),
          instagram: form.social.instagram.trim(),
        },
      };

      onSave(cleaned);
      setChangeLog([]);
    },
    [form, validate, onSave, data],
  );

  /* ── Keyboard: Ctrl+Enter pentru salvare ── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit(e as unknown as FormEvent);
      }
    },
    [handleSubmit],
  );

  /* ── Numele despărțit pentru previzualizare ── */
  const nameWords = form.name.trim().split(" ");
  const firstName = nameWords[0] || "Nexus";
  const restName = nameWords.slice(1).join(" ") || "Dev Studio";

  /* ── Clase input ── */
  const inputClass = (field: string) =>
    `w-full bg-white/[0.04] border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 
     outline-none transition-all duration-200 font-sans ${
       errors[field]
         ? "border-red-400/60 focus:border-red-400/70 focus:ring-1 focus:ring-red-400/20"
         : "border-glass-border focus:border-nexus-glow/40 focus:ring-1 focus:ring-nexus-glow/10 hover:border-glass-border-strong"
     }`;

  /* ═════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col xl:flex-row gap-6" onKeyDown={handleKeyDown}>
      {/* ═════════════════════════════════════════
          FORMULAR – Stânga
          ═════════════════════════════════════════ */}
      <div className="flex-1 min-w-0">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Header formular cu indicatori de sănătate ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                Conținut Hero
              </h3>
              {/* Indicator validare */}
              {Object.keys(errors).length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-red-400/80 bg-red-500/10 border border-red-400/20 rounded-full px-2.5 py-0.5">
                  <i className="fa-solid fa-triangle-exclamation text-[9px]" />
                  {Object.keys(errors).length} erori
                </span>
              )}
            </div>

            {/* Buton toggle change log */}
            {changeLog.length > 0 && (
              <button
                type="button"
                onClick={() => setShowChanges((p) => !p)}
                className="flex items-center gap-1.5 text-[10px] font-medium text-gold/70 hover:text-gold bg-gold/5 hover:bg-gold/10 border border-gold/15 rounded-full px-2.5 py-1 transition-all duration-200"
              >
                <i className="fa-solid fa-clock-rotate-left text-[9px]" />
                {changeLog.length} modificări
                <i
                  className={`fa-solid fa-chevron-down text-[8px] transition-transform duration-200 ${
                    showChanges ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
          </div>

          {/* ── Change log panel ── */}
          <AnimatePresence>
            {showChanges && changeLog.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-gold/15 bg-gold/[0.03] p-4 space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-[10px] font-semibold text-gold/60 uppercase tracking-widest mb-2">
                    Istoric modificări sesiune
                  </p>
                  {changeLog.slice(0, 20).map((entry, i) => (
                    <div
                      key={`${entry.timestamp}-${i}`}
                      className="flex items-start gap-2 text-[11px]"
                    >
                      <span className="text-gold/40 font-mono flex-shrink-0 mt-0.5">
                        {new Date(entry.timestamp).toLocaleTimeString("ro-RO", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      <span className="text-white/50 font-mono flex-shrink-0">
                        {entry.field}
                      </span>
                      <span className="text-red-400/60 line-through truncate max-w-[120px]">
                        {entry.oldValue || "(gol)"}
                      </span>
                      <i className="fa-solid fa-arrow-right text-[8px] text-white/20 flex-shrink-0 mt-1" />
                      <span className="text-emerald-400/60 truncate max-w-[120px]">
                        {entry.newValue || "(gol)"}
                      </span>
                    </div>
                  ))}
                  {changeLog.length > 20 && (
                    <p className="text-[10px] text-white/20 text-center">
                      +{changeLog.length - 20} alte modificări
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Identitate ── */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
              <i className="fa-solid fa-user text-[10px] text-nexus-glow/60" />
              Identitate
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Nume Studio"
                field="hero-name"
                error={errors.name}
                required
              >
                <input
                  ref={nameInputRef}
                  id="hero-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Nexus Dev Studio"
                  className={inputClass("name")}
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "hero-name-err" : undefined}
                  autoComplete="organization"
                />
              </Field>

              <Field label="An fondare" field="hero-founded">
                <input
                  id="hero-founded"
                  type="number"
                  value={form.founded}
                  onChange={(e) => update("founded", e.target.value)}
                  placeholder={String(new Date().getFullYear())}
                  min={1990}
                  max={new Date().getFullYear() + 1}
                  className={inputClass("founded")}
                  aria-label="Anul fondării"
                />
              </Field>
            </div>

            <Field
              label="Tagline"
              field="hero-tagline"
              error={errors.tagline}
              required
            >
              <input
                id="hero-tagline"
                type="text"
                value={form.tagline}
                onChange={(e) => update("tagline", e.target.value)}
                placeholder="Transformăm idei în realitate digitală."
                className={inputClass("tagline")}
                aria-required="true"
                aria-invalid={!!errors.tagline}
                aria-describedby={errors.tagline ? "hero-tagline-err" : undefined}
              />
              <CharCount current={form.tagline.length} max={120} />
            </Field>

            <Field
              label="Descriere"
              field="hero-desc"
              error={errors.description}
              required
            >
              <textarea
                id="hero-desc"
                rows={4}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Descrierea completă a studioului..."
                className={inputClass("description")}
                aria-required="true"
                aria-invalid={!!errors.description}
                aria-describedby={
                  errors.description ? "hero-desc-err" : undefined
                }
              />
              <CharCount current={form.description.length} max={500} />
            </Field>
          </fieldset>

          {/* ── Media ── */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
              <i className="fa-solid fa-photo-film text-[10px] text-nexus-glow/60" />
              Media
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Video Background URL"
                field="hero-video"
                error={errors.heroVideoUrl}
              >
                <div className="relative">
                  <input
                    id="hero-video"
                    type="text"
                    value={form.heroVideoUrl}
                    onChange={(e) => update("heroVideoUrl", e.target.value)}
                    placeholder="/video/hero-bg.mp4"
                    className={inputClass("heroVideoUrl")}
                    aria-describedby="hero-video-hint"
                  />
                  {form.heroVideoUrl.trim() && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {videoError ? (
                        <i
                          className="fa-solid fa-circle-exclamation text-red-400/60 text-xs"
                          title="Fișierul video nu s-a putut încărca"
                        />
                      ) : (
                        <i
                          className="fa-solid fa-circle-check text-emerald-400/60 text-xs"
                          title="URL valid"
                        />
                      )}
                    </span>
                  )}
                </div>
                <p
                  id="hero-video-hint"
                  className="text-[10px] text-white/25 mt-1.5 font-mono"
                >
                  Cale relativă sau URL absolut. Se recomandă MP4.
                </p>
              </Field>

              <Field
                label="Poster URL"
                field="hero-poster"
                error={errors.heroPosterUrl}
                required
              >
                <div className="relative">
                  <input
                    id="hero-poster"
                    type="text"
                    value={form.heroPosterUrl}
                    onChange={(e) => update("heroPosterUrl", e.target.value)}
                    placeholder="/images/hero-poster.jpg"
                    className={inputClass("heroPosterUrl")}
                    aria-required="true"
                    aria-invalid={!!errors.heroPosterUrl}
                  />
                  {form.heroPosterUrl.trim() && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {posterError ? (
                        <i
                          className="fa-solid fa-circle-exclamation text-red-400/60 text-xs"
                          title="Poster-ul nu s-a putut încărca"
                        />
                      ) : (
                        <i
                          className="fa-solid fa-image text-white/25 text-xs"
                          title="Poster setat"
                        />
                      )}
                    </span>
                  )}
                </div>
              </Field>
            </div>

            <Field label="CV URL" field="hero-cv">
              <input
                id="hero-cv"
                type="text"
                value={form.cvUrl}
                onChange={(e) => update("cvUrl", e.target.value)}
                placeholder="/files/cv.pdf"
                className={inputClass("cvUrl")}
                aria-label="URL către CV"
              />
              <p className="text-[10px] text-white/25 mt-1.5 font-mono">
                Opțional. Link către CV-ul sau portofoliul descărcabil.
              </p>
            </Field>
          </fieldset>

          {/* ── Social Media ── */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
              <i className="fa-solid fa-share-nodes text-[10px] text-nexus-glow/60" />
              Rețele Sociale
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(Object.keys(PLATFORM_LABELS) as SocialPlatform[]).map((p) => (
                <Field
                  key={p}
                  label={PLATFORM_LABELS[p]}
                  field={`hero-social-${p}`}
                  error={errors[`social.${p}`]}
                >
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                      <i
                        className={`fa-brands ${PLATFORM_ICONS[p]} text-xs`}
                      />
                    </span>
                    <input
                      id={`hero-social-${p}`}
                      type="url"
                      value={form.social[p]}
                      onChange={(e) => updateSocial(p, e.target.value)}
                      placeholder={PLATFORM_PLACEHOLDERS[p]}
                      className={`${inputClass(`social.${p}`)} pl-9`}
                      aria-label={`URL ${PLATFORM_LABELS[p]}`}
                      aria-invalid={!!errors[`social.${p}`]}
                    />
                  </div>
                </Field>
              ))}
            </div>
          </fieldset>

          {/* ── Submit Button ── */}
          <SubmitButton saving={saving} hasErrors={Object.keys(errors).length > 0} />
        </form>
      </div>

      {/* ═════════════════════════════════════════
          PREVIZUALIZARE LIVE – Dreapta
          ═════════════════════════════════════════ */}
      <div className="xl:w-[420px] flex-shrink-0">
        <div className="sticky top-24 space-y-4">
          {/* Header preview */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-eye text-[10px] text-nexus-glow/60" />
              Previzualizare Live
            </h3>

            {/* Toggle mod preview */}
            <div className="flex rounded-lg border border-glass-border overflow-hidden">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`px-3 py-1.5 text-[10px] font-medium transition-all duration-200 ${
                  previewMode === "desktop"
                    ? "bg-nexus-accent/20 text-nexus-glow"
                    : "text-white/35 hover:text-white/60"
                }`}
                aria-pressed={previewMode === "desktop"}
                aria-label="Previzualizare desktop"
              >
                <i className="fa-solid fa-desktop mr-1" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`px-3 py-1.5 text-[10px] font-medium transition-all duration-200 ${
                  previewMode === "mobile"
                    ? "bg-nexus-accent/20 text-nexus-glow"
                    : "text-white/35 hover:text-white/60"
                }`}
                aria-pressed={previewMode === "mobile"}
                aria-label="Previzualizare mobil"
              >
                <i className="fa-solid fa-mobile-screen mr-1" />
                Mobil
              </button>
            </div>
          </div>

          {/* Card previzualizare */}
          <div
            className={`relative overflow-hidden rounded-glass-lg border border-glass-border transition-all duration-300 ${
              previewMode === "mobile" ? "max-w-[320px] mx-auto" : "w-full"
            }`}
          >
            {/* Fundal poster */}
            <div className="relative aspect-[16/9] sm:aspect-[16/8] bg-nexus-dark overflow-hidden">
              {/* Poster image */}
              {form.heroPosterUrl.trim() ? (
                <img
                  src={form.heroPosterUrl}
                  alt=""
                  role="presentation"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={() => setPosterError(true)}
                  onLoad={() => setPosterError(false)}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-nexus-medium to-nexus-dark flex items-center justify-center">
                  <div className="text-center">
                    <i className="fa-solid fa-image text-white/10 text-3xl mb-2 block" />
                    <span className="text-[10px] text-white/20 font-mono">
                      Poster indisponibil
                    </span>
                  </div>
                </div>
              )}

              {/* Video overlay (subtle indicator) */}
              {form.heroVideoUrl.trim() && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
                  <i className="fa-solid fa-video text-[9px] text-nexus-glow/80" />
                  <span className="text-[9px] text-white/60 font-mono">
                    Video BG
                  </span>
                </div>
              )}

              {/* Overlay întunecat */}
              <div className="absolute inset-0 bg-gradient-to-b from-nexus-dark/60 via-nexus-dark/40 to-nexus-dark/80" />

              {/* Conținut text în overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                {/* Badge */}
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-nexus-glow bg-nexus-accent/15 border border-nexus-accent/25 rounded-full px-3 py-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-light opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gold" />
                  </span>
                  {form.founded
                    ? `Fondat în ${form.founded}`
                    : "Nexus Dev Studio"}
                </span>

                {/* Nume */}
                <p
                  className={`mt-3 font-heading font-extrabold tracking-tight leading-tight text-white ${
                    previewMode === "mobile"
                      ? "text-xl"
                      : "text-2xl sm:text-3xl"
                  }`}
                >
                  <span>{firstName}</span>{" "}
                  <span className="text-nexus-gradient">{restName}</span>
                </p>

                {/* Tagline */}
                <p
                  className={`mt-2 text-white/75 font-medium ${
                    previewMode === "mobile" ? "text-xs" : "text-sm sm:text-base"
                  }`}
                >
                  {form.tagline.trim() || "Tagline-ul tău aici"}
                </p>

                {/* Descriere (doar pe desktop) */}
                {previewMode === "desktop" && form.description.trim() && (
                  <p className="mt-2 text-white/45 text-xs max-w-md leading-relaxed line-clamp-2">
                    {form.description}
                  </p>
                )}
              </div>
            </div>

            {/* Info bar */}
            <div className="px-4 py-3 bg-nexus-dark/60 backdrop-blur-sm border-t border-glass-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-nexus-accent/20 border border-nexus-accent/25 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-nexus-glow">
                      {getInitials(form.name.trim() || "Nexus Dev Studio")}
                    </span>
                  </div>
                  <span className="text-[11px] text-white/50 font-mono truncate">
                    {form.name.trim() || "Nexus Dev Studio"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.4)]" />
                  <span className="text-[9px] text-emerald-400/70 font-mono">
                    Live
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sfaturi rapide */}
          <div className="rounded-xl border border-glass-border bg-white/[0.02] p-4">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">
              <i className="fa-solid fa-lightbulb text-gold/50 mr-1.5" />
              Sfaturi
            </p>
            <ul className="space-y-2 text-[11px] text-white/40 leading-relaxed">
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                Video-ul din Hero trebuie să fie scurt (10-20s), fără sunet și
                loop.
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                Poster-ul e afișat pe mobile și înainte de încărcarea video-ului.
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                Tagline-ul ar trebui să fie scurt, memorabil și să exprime
                valoarea oferită.
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                Modificările se salvează prin butonul de jos sau Ctrl+Enter.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   Componente utilitare
   ═════════════════════════════════════════════════════════ */

/** Label + input wrapper cu suport accesibilitate */
function Field({
  label,
  field,
  error,
  required = false,
  children,
}: {
  label: string;
  field: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const errorId = `${field}-err`;

  return (
    <div>
      <label
        htmlFor={field}
        className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider"
      >
        {label}
        {required && (
          <span className="text-red-400/70 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-xs text-red-400/80 flex items-center gap-1.5"
        >
          <i className="fa-solid fa-circle-exclamation text-[10px]" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Contor de caractere */
function CharCount({ current, max }: { current: number; max: number }) {
  const ratio = current / max;
  const isOver = current > max;
  const isWarning = ratio > 0.85 && !isOver;

  return (
    <div className="flex items-center justify-end gap-2 mt-1.5">
      {/* Bară progres */}
      <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isOver
              ? "bg-red-400/60"
              : isWarning
                ? "bg-amber-400/60"
                : "bg-nexus-glow/50"
          }`}
          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
        />
      </div>
      <span
        className={`text-[10px] font-mono tabular-nums ${
          isOver
            ? "text-red-400/70"
            : isWarning
              ? "text-amber-400/60"
              : "text-white/25"
        }`}
        aria-live="polite"
      >
        {current}/{max}
        {isOver && " — depășit"}
      </span>
    </div>
  );
}

/** Buton submit cu stare de loading și shortcut hint */
function SubmitButton({
  saving,
  hasErrors,
}: {
  saving: boolean;
  hasErrors: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-glass-border">
      <button
        type="submit"
        disabled={saving || hasErrors}
        className={`
          glass-btn text-sm px-6 py-2.5
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
        `}
        aria-busy={saving}
      >
        {saving ? (
          <>
            <span
              className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white animate-spin"
              aria-hidden="true"
            />
            <span>Se salvează...</span>
          </>
        ) : (
          <>
            <i className="fa-solid fa-floppy-disk text-xs" />
            <span>Salvează secțiunea Hero</span>
          </>
        )}
      </button>

      <div className="flex items-center gap-3">
        {!saving && (
          <span className="text-[10px] text-white/20 font-mono hidden sm:inline">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[9px]">
              Ctrl+Enter
            </kbd>
            {"  "}salvează
          </span>
        )}

        {hasErrors && (
          <span className="text-[10px] text-red-400/50 font-mono flex items-center gap-1">
            <i className="fa-solid fa-circle-exclamation text-[9px]" />
            Verifică câmpurile marcate
          </span>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   Exporturi denumite
   ═════════════════════════════════════════════════════════ */

export type { HeroFormData, PreviewMode, SocialPlatform, FormErrors, ChangeLogEntry };