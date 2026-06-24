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
import type { ContactFallback } from "../../../../lib/fallback";

/* ═══════════════════════════════════════════════════════════════════════════
   ContactEditor – Editor vizual pentru setări contact & rețele sociale
   Oferă previzualizare live, validare avansată și urmărire modificări.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────
   Tipuri
   ───────────────────────────────────────────────────────── */

type SocialPlatform = "github" | "linkedin" | "twitter" | "instagram";

interface ContactFormData {
  email: string;
  phone: string;
  address: string;
  workingHours: string;
}

interface SocialFormData {
  github: string;
  linkedin: string;
  twitter: string;
  instagram: string;
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

function formatPhoneForDisplay(phone: string): string {
  return phone.trim() || "+40 723 456 789";
}

function maskEmailPreview(email: string): string {
  const trimmed = email.trim();
  if (!trimmed) return "contact@studio.ro";
  return trimmed;
}

/* ═════════════════════════════════════════════════════════
   Componenta principală
   ═════════════════════════════════════════════════════════ */

export interface ContactEditorProps {
  /** Datele curente de contact */
  data: ContactFallback;
  /** Date rețele sociale (opțional) */
  social?: SocialFormData;
  /** Callback salvare */
  onSave: (data: ContactFallback, social?: SocialFormData) => void;
  /** Callback dirty */
  onDirty: () => void;
  /** Stare salvare */
  saving: boolean;
}

export default function ContactEditor({
  data,
  social: initialSocial,
  onSave,
  onDirty,
  saving,
}: ContactEditorProps) {
  /* ── Stare formular contact ── */
  const [form, setForm] = useState<ContactFormData>(() => ({
    email: data.email,
    phone: data.phone,
    address: data.address,
    workingHours: data.workingHours,
  }));

  /* ── Stare formular social ── */
  const [social, setSocial] = useState<SocialFormData>(
    () =>
      initialSocial ?? {
        github: "",
        linkedin: "",
        twitter: "",
        instagram: "",
      },
  );

  const [errors, setErrors] = useState<FormErrors>({});
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [showChanges, setShowChanges] = useState(false);
  const [showSocialSection, setShowSocialSection] = useState(
    !!initialSocial,
  );

  const emailInputRef = useRef<HTMLInputElement>(null);

  /* ── Sincronizare date externe ── */
  useEffect(() => {
    setForm({
      email: data.email,
      phone: data.phone,
      address: data.address,
      workingHours: data.workingHours,
    });
    setErrors({});
  }, [data]);

  useEffect(() => {
    if (initialSocial) {
      setSocial(initialSocial);
      setShowSocialSection(true);
    }
  }, [initialSocial]);

  /* ── Focus primul input la montare ── */
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  /* ── Actualizare câmp generic ── */
  const update = useCallback(
    (field: string, value: string) => {
      setForm((prev) => {
        const oldValue = String(prev[field as keyof ContactFormData] ?? "");
        const newValue = String(value);
        if (oldValue !== newValue) {
          setChangeLog((log) => [
            { field, oldValue, newValue, timestamp: Date.now() },
            ...log.slice(0, 49),
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
      setSocial((prev) => {
        const oldVal = prev[platform];
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
          [platform]: value,
        };
      });
      onDirty();
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`social.${platform}`];
        return next;
      });
    },
    [onDirty],
  );

  /* ── Validare ── */
  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};

    // Email
    if (!form.email.trim()) {
      errs['email'] = "Adresa de email este obligatorie.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs['email'] = "Adresa de email este invalidă.";
    }

    // Telefon
    if (!form.phone.trim()) {
      errs['phone'] = "Numărul de telefon este obligatoriu.";
    } else if (
      form.phone.trim().length < 7 &&
      !/^\+?\d[\d\s\-.]{6,}$/.test(form.phone.trim())
    ) {
      errs['phone'] = "Numărul de telefon pare invalid (minim 7 cifre).";
    }

    // Adresă
    if (!form.address.trim()) {
      errs['address'] = "Adresa este obligatorie.";
    } else if (form.address.trim().length < 5) {
      errs['address'] = "Adresa trebuie să aibă cel puțin 5 caractere.";
    }

    // Program de lucru
    if (!form.workingHours.trim()) {
      errs['workingHours'] = "Programul de lucru este obligatoriu.";
    }

    // Validare URL-uri social (doar dacă secțiunea e activă)
    if (showSocialSection) {
      const urlPattern = /^https?:\/\/.+/i;
      (Object.keys(PLATFORM_LABELS) as SocialPlatform[]).forEach((p) => {
        const val = social[p].trim();
        if (val && !urlPattern.test(val)) {
          errs[`social.${p}`] =
            "URL invalid (trebuie să înceapă cu http(s)://).";
        }
      });
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, social, showSocialSection]);

  /* ── Submit ── */
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      const cleaned: ContactFallback = {
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        workingHours: form.workingHours.trim(),
      };

      const cleanedSocial: SocialFormData | undefined = showSocialSection
        ? {
            github: social.github.trim(),
            linkedin: social.linkedin.trim(),
            twitter: social.twitter.trim(),
            instagram: social.instagram.trim(),
          }
        : undefined;

      onSave(cleaned, cleanedSocial);
      setChangeLog([]);
    },
    [form, social, validate, onSave, showSocialSection],
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

  /* ── Clase input ── */
  const inputClass = (field: string) =>
    `w-full bg-white/[0.04] border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 
     outline-none transition-all duration-200 font-sans ${
       errors[field]
         ? "border-red-400/60 focus:border-red-400/70 focus:ring-1 focus:ring-red-400/20"
         : "border-glass-border focus:border-nexus-glow/40 focus:ring-1 focus:ring-nexus-glow/10 hover:border-glass-border-strong"
     }`;

  /* ── Social-uri active (cele cu URL completat) ── */
  const activeSocials = (
    Object.keys(PLATFORM_LABELS) as SocialPlatform[]
  ).filter((p) => social[p].trim().length > 0);

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
                Setări Contact
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
                        {new Date(entry.timestamp).toLocaleTimeString(
                          "ro-RO",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          },
                        )}
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

          {/* ── Contact principal ── */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
              <i className="fa-solid fa-address-card text-[10px] text-nexus-glow/60" />
              Contact principal
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Email"
                field="contact-email"
                error={errors['email']}
                required
              >
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                    <i className="fa-solid fa-envelope text-xs" />
                  </span>
                  <input
                    ref={emailInputRef}
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="contact@nexusdevstudio.ro"
                    className={`${inputClass("email")} pl-10`}
                    aria-required="true"
                    aria-invalid={!!errors['email']}
                    aria-describedby={
                      errors['email'] ? "contact-email-err" : undefined
                    }
                    autoComplete="email"
                  />
                </div>
              </Field>

              <Field
                label="Telefon"
                field="contact-phone"
                error={errors['phone']}
                required
              >
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                    <i className="fa-solid fa-phone text-xs" />
                  </span>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+40 723 456 789"
                    className={`${inputClass("phone")} pl-10`}
                    aria-required="true"
                    aria-invalid={!!errors['phone']}
                    aria-describedby={
                      errors['phone'] ? "contact-phone-err" : undefined
                    }
                    autoComplete="tel"
                  />
                </div>
              </Field>
            </div>

            <Field
              label="Adresă"
              field="contact-address"
              error={errors['address']}
              required
            >
              <div className="relative">
                <span className="absolute left-3.5 top-[14px] text-white/20">
                  <i className="fa-solid fa-location-dot text-xs" />
                </span>
                <textarea
                  id="contact-address"
                  rows={2}
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="București, România — disponibil remote global."
                  className={`${inputClass("address")} pl-10 resize-none`}
                  aria-required="true"
                  aria-invalid={!!errors['address']}
                  aria-describedby={
                    errors['address'] ? "contact-address-err" : undefined
                  }
                  autoComplete="street-address"
                />
              </div>
            </Field>

            <Field
              label="Program de lucru"
              field="contact-hours"
              error={errors['workingHours']}
              required
            >
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                  <i className="fa-solid fa-clock text-xs" />
                </span>
                <input
                  id="contact-hours"
                  type="text"
                  value={form.workingHours}
                  onChange={(e) => update("workingHours", e.target.value)}
                  placeholder="Luni – Vineri, 09:00 – 18:00 (EET)"
                  className={`${inputClass("workingHours")} pl-10`}
                  aria-required="true"
                  aria-invalid={!!errors['workingHours']}
                  aria-describedby={
                    errors['workingHours']
                      ? "contact-hours-err"
                      : undefined
                  }
                />
              </div>
            </Field>
          </fieldset>

          {/* ── Rețele Sociale ── */}
          <fieldset className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-share-nodes text-[10px] text-nexus-glow/60" />
                Rețele Sociale
              </legend>

              {/* Toggle secțiune social */}
              <button
                type="button"
                onClick={() => setShowSocialSection((p) => !p)}
                className={`flex items-center gap-2 text-[10px] font-medium rounded-full px-3 py-1 transition-all duration-200 ${
                  showSocialSection
                    ? "bg-nexus-accent/15 text-nexus-glow border border-nexus-accent/25"
                    : "text-white/35 border border-transparent hover:text-white/60"
                }`}
                aria-pressed={showSocialSection}
              >
                {showSocialSection ? (
                  <>
                    <i className="fa-solid fa-eye text-[9px]" />
                    Afișat
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-eye-slash text-[9px]" />
                    Ascuns
                  </>
                )}
              </button>
            </div>

            <AnimatePresence>
              {showSocialSection && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(Object.keys(PLATFORM_LABELS) as SocialPlatform[]).map(
                        (p) => (
                          <Field
                            key={p}
                            label={PLATFORM_LABELS[p]}
                            field={`contact-social-${p}`}
                            error={errors[`social.${p}`]}
                          >
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                                <i
                                  className={`fa-brands ${PLATFORM_ICONS[p]} text-xs`}
                                />
                              </span>
                              <input
                                id={`contact-social-${p}`}
                                type="url"
                                value={social[p]}
                                onChange={(e) =>
                                  updateSocial(p, e.target.value)
                                }
                                placeholder={PLATFORM_PLACEHOLDERS[p]}
                                className={`${inputClass(`social.${p}`)} pl-9`}
                                aria-label={`URL ${PLATFORM_LABELS[p]}`}
                                aria-invalid={
                                  !!errors[`social.${p}`]
                                }
                              />
                            </div>
                          </Field>
                        ),
                      )}
                    </div>

                    {/* Indicator social-uri completate */}
                    {activeSocials.length > 0 && (
                      <div className="flex items-center gap-2 text-[10px] text-white/30">
                        <i className="fa-solid fa-circle-check text-emerald-500/60 text-[9px]" />
                        {activeSocials.length} din 4 rețele configurate
                        <span className="text-white/15">
                          ({activeSocials
                            .map((p) => PLATFORM_LABELS[p])
                            .join(", ")}
                          )
                        </span>
                      </div>
                    )}

                    {activeSocials.length === 0 && (
                      <div className="flex items-center gap-2 text-[10px] text-white/20">
                        <i className="fa-solid fa-circle-info text-[9px]" />
                        Nicio rețea socială configurată. Completează cel puțin
                        un URL.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </fieldset>

          {/* ── Submit Button ── */}
          <SubmitButton
            saving={saving}
            hasErrors={Object.keys(errors).length > 0}
            hasChanges={changeLog.length > 0}
          />
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
            {/* Fundal imagine */}
            <div className="relative aspect-[16/10] bg-nexus-dark overflow-hidden">
              {/* Imagine fundal contact */}
              <img
                src="/images/contact-editor-bg.jpg"
                alt=""
                role="presentation"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Overlay întunecat cu gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-nexus-dark via-nexus-dark/70 to-nexus-dark/40" />

              {/* Etichetă secțiune */}
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-nexus-glow bg-nexus-accent/20 border border-nexus-accent/25 rounded-full px-3 py-1 backdrop-blur-sm">
                  <i className="fa-solid fa-envelope text-[9px]" />
                  Contact
                </span>
              </div>

              {/* Conținut contact în overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                <h2
                  className={`font-heading font-extrabold tracking-tight text-white mb-3 ${
                    previewMode === "mobile"
                      ? "text-xl"
                      : "text-2xl sm:text-3xl"
                  }`}
                >
                  Hai să <span className="text-nexus-gradient">vorbim</span>
                </h2>
                <p
                  className={`text-white/65 ${
                    previewMode === "mobile" ? "text-xs" : "text-sm"
                  }`}
                >
                  {form.workingHours.trim()
                    ? form.workingHours
                    : "Disponibil pentru colaborări"}
                </p>
              </div>
            </div>

            {/* Card detalii contact */}
            <div className="px-5 py-5 bg-nexus-dark/60 backdrop-blur-sm space-y-4">
              {/* Email */}
              <div className="flex items-start gap-3 group/item">
                <div className="w-9 h-9 rounded-lg bg-nexus-accent/20 border border-nexus-accent/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="fa-solid fa-envelope text-xs text-nexus-glow" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-0.5">
                    Email
                  </p>
                  <a
                    href={`mailto:${form.email.trim() || "#"}`}
                    className={`text-sm font-medium truncate block transition-colors duration-200 ${
                      form.email.trim()
                        ? "text-white/80 hover:text-nexus-glow"
                        : "text-white/25 italic"
                    }`}
                    onClick={(e) => {
                      if (!form.email.trim()) e.preventDefault();
                    }}
                  >
                    {maskEmailPreview(form.email)}
                  </a>
                </div>
                {form.email.trim() && (
                  <span className="text-[9px] text-emerald-400/50 font-mono flex-shrink-0 mt-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <i className="fa-solid fa-copy mr-1 text-[8px]" />
                    copiază
                  </span>
                )}
              </div>

              {/* Telefon */}
              <div className="flex items-start gap-3 group/item">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="fa-solid fa-phone text-xs text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-0.5">
                    Telefon
                  </p>
                  <a
                    href={`tel:${form.phone.trim().replace(/\s/g, "") || "#"}`}
                    className={`text-sm font-medium truncate block transition-colors duration-200 ${
                      form.phone.trim()
                        ? "text-white/80 hover:text-emerald-400"
                        : "text-white/25 italic"
                    }`}
                    onClick={(e) => {
                      if (!form.phone.trim()) e.preventDefault();
                    }}
                  >
                    {formatPhoneForDisplay(form.phone)}
                  </a>
                </div>
              </div>

              {/* Adresă */}
              <div className="flex items-start gap-3 group/item">
                <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="fa-solid fa-location-dot text-xs text-gold" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-0.5">
                    Adresă
                  </p>
                  <p
                    className={`text-sm leading-relaxed ${
                      form.address.trim()
                        ? "text-white/65"
                        : "text-white/25 italic"
                    }`}
                  >
                    {form.address.trim() || "Adresa ta aici..."}
                  </p>
                </div>
              </div>

              {/* Program */}
              <div className="flex items-start gap-3 group/item">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="fa-solid fa-clock text-xs text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-0.5">
                    Program
                  </p>
                  <p
                    className={`text-sm ${
                      form.workingHours.trim()
                        ? "text-white/65"
                        : "text-white/25 italic"
                    }`}
                  >
                    {form.workingHours.trim() ||
                      "Luni – Vineri, 09:00 – 18:00"}
                  </p>
                </div>
              </div>

              {/* Social icons (dacă sunt completate) */}
              {showSocialSection && activeSocials.length > 0 && (
                <>
                  {/* Separator */}
                  <div className="border-t border-glass-border pt-4">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-3">
                      <i className="fa-solid fa-share-nodes text-[9px] mr-1.5 text-nexus-glow/50" />
                      Rețele sociale
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeSocials.map((p) => (
                        <a
                          key={p}
                          href={social[p] || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-9 h-9 rounded-lg bg-white/[0.04] border border-glass-border hover:border-nexus-glow/30 hover:bg-nexus-accent/15 flex items-center justify-center transition-all duration-200 group/social"
                          title={PLATFORM_LABELS[p]}
                          onClick={(e) => {
                            if (!social[p]) e.preventDefault();
                          }}
                        >
                          <i
                            className={`fa-brands ${PLATFORM_ICONS[p]} text-white/45 group-hover/social:text-nexus-glow text-sm transition-colors`}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Status bar */}
              <div className="pt-3 border-t border-glass-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.4)]" />
                  <span className="text-[10px] text-white/25 font-mono">
                    {form.email.trim() ? "Online" : "Incomplet"}
                  </span>
                </div>
                <span className="text-[9px] text-white/20 font-mono">
                  {activeSocials.length > 0
                    ? `${activeSocials.length} rețele`
                    : "Fără social"}
                </span>
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
                Folosește o adresă de email profesională asociată domeniului
                tău.
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                Numărul de telefon trebuie să fie în format internațional
                (+40...).
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                Programul de lucru ajută clienții să știe când pot aștepta un
                răspuns.
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                Completează URL-urile rețelelor sociale pentru a crește
                încrederea.
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
  error: string | undefined;
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

/** Buton submit cu stare de loading și shortcut hint */
function SubmitButton({
  saving,
  hasErrors,
  hasChanges,
}: {
  saving: boolean;
  hasErrors: boolean;
  hasChanges: boolean;
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
            <span>Salvează setările contact</span>
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

        {!hasErrors && hasChanges && !saving && (
          <span
            className="w-2 h-2 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.5)] flex-shrink-0"
            title="Modificări nesalvate"
          />
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   Exporturi denumite
   ═════════════════════════════════════════════════════════ */

export type {
  ContactFormData,
  SocialFormData,
  SocialPlatform,
  FormErrors,
  PreviewMode,
  ChangeLogEntry,
};
export { PLATFORM_LABELS, PLATFORM_ICONS, PLATFORM_PLACEHOLDERS };