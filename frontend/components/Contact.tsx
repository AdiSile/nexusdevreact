"use client";

import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faPhone,
  faLocationDot,
  faClock,
  faPaperPlane,
  faCheckCircle,
  faExclamationTriangle,
  faSpinner,
  faUser,
  faBuilding,
  faTag,
  faMessage,
  faChevronRight,
  faGlobe,
} from "@fortawesome/free-solid-svg-icons";
import GlassCard from "./GlassCard";
import { submitContactForm } from "../lib/api";
import { fetchSettings } from "../lib/api";
import type { NexusSettings } from "../lib/fallback";
import { fallbackSettings } from "../lib/fallback";
import type { ContactFormInput } from "../lib/types";

/* ─────────────────────────────────────────────
   Tipuri
   ───────────────────────────────────────────── */

export interface ContactProps {
  /** Setări preîncărcate (opțional) */
  settings?: NexusSettings;
  /** Clasă CSS suplimentară */
  className?: string;
  /** ID DOM */
  id?: string;
}

/** Erori de validare per câmp */
interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
  phone?: string;
  subject?: string;
}

/** Stări posibile ale formularului */
type FormStatus = "idle" | "submitting" | "success" | "error";

/* ─────────────────────────────────────────────
   Constante
   ───────────────────────────────────────────── */

const BUDGET_OPTIONS = [
  { value: "", label: "Selectează un buget (opțional)" },
  { value: "sub-500", label: "Sub 500 EUR" },
  { value: "500-1500", label: "500 – 1.500 EUR" },
  { value: "1500-5000", label: "1.500 – 5.000 EUR" },
  { value: "5000-15000", label: "5.000 – 15.000 EUR" },
  { value: "peste-15000", label: "Peste 15.000 EUR" },
  { value: "discutie", label: "De discutat" },
];

const TIMELINE_OPTIONS = [
  { value: "", label: "Selectează un termen (opțional)" },
  { value: "urgent", label: "Urgent (sub 1 săptămână)" },
  { value: "1-2-saptamani", label: "1 – 2 săptămâni" },
  { value: "2-4-saptamani", label: "2 – 4 săptămâni" },
  { value: "1-3-luni", label: "1 – 3 luni" },
  { value: "flexibil", label: "Flexibil / De discutat" },
];

/* ─────────────────────────────────────────────
   Helpers de validare
   ───────────────────────────────────────────── */

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  if (!phone) return true; // opțional
  return /^[+]?[\d\s\-().]{7,20}$/.test(phone);
}

function validateForm(data: ContactFormInput): FormErrors {
  const errors: FormErrors = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = "Numele trebuie să aibă cel puțin 2 caractere.";
  }

  if (!data.email || !validateEmail(data.email)) {
    errors.email = "Te rugăm să introduci o adresă de email validă.";
  }

  if (!data.message || data.message.trim().length < 10) {
    errors.message = "Mesajul trebuie să aibă cel puțin 10 caractere.";
  }

  if (data.phone && !validatePhone(data.phone)) {
    errors.phone = "Numărul de telefon nu pare valid.";
  }

  return errors;
}

/* ─────────────────────────────────────────────
   Componenta Contact
   ───────────────────────────────────────────── */

export default function Contact({
  settings: initialSettings,
  className = "",
  id,
}: ContactProps) {
  /* ── Stare settings ── */
  const [settings, setSettings] = useState<NexusSettings | null>(
    initialSettings ?? null,
  );

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
      return;
    }
    let cancelled = false;
    fetchSettings()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => {
        if (!cancelled) {
          console.warn("[Contact] Fetch eșuat — se folosește fallback.");
          setSettings(fallbackSettings);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialSettings]);

  /* ── Stare formular ── */
  const [formData, setFormData] = useState<ContactFormInput>({
    name: "",
    email: "",
    phone: "",
    company: "",
    subject: "",
    message: "",
    budgetRange: "",
    timeline: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<FormStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  /* ── Focus management pentru erori ── */
  const errorRef = useRef<HTMLDivElement>(null);

  /* ── Handler schimbare câmp ── */
  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));

      if (touched.has(name)) {
        const partial: ContactFormInput = { ...formData, [name]: value };
        const newErrors = validateForm(partial);
        setErrors((prev) => {
          const updated = { ...prev };
          if (newErrors[name as keyof FormErrors]) {
            updated[name as keyof FormErrors] =
              newErrors[name as keyof FormErrors];
          } else {
            delete updated[name as keyof FormErrors];
          }
          return updated;
        });
      }
    },
    [formData, touched],
  );

  /* ── Handler blur ── */
  const handleBlur = useCallback(
    (
      e: React.FocusEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const { name } = e.target;
      setTouched((prev) => new Set(prev).add(name));

      const partial: ContactFormInput = { ...formData };
      const newErrors = validateForm(partial);
      setErrors((prev) => {
        const updated = { ...prev };
        if (newErrors[name as keyof FormErrors]) {
          updated[name as keyof FormErrors] =
            newErrors[name as keyof FormErrors];
        } else {
          delete updated[name as keyof FormErrors];
        }
        return updated;
      });
    },
    [formData],
  );

  /* ── Submit handler ── */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      const validationErrors = validateForm(formData);
      setErrors(validationErrors);
      setTouched(
        new Set(["name", "email", "message", "phone", "subject"]),
      );

      if (Object.keys(validationErrors).length > 0) {
        errorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        errorRef.current?.focus();
        return;
      }

      setStatus("submitting");
      setSubmitError(null);

      try {
        const response = await submitContactForm(formData);

        if (response.success) {
          setStatus("success");
          setFormData({
            name: "",
            email: "",
            phone: "",
            company: "",
            subject: "",
            message: "",
            budgetRange: "",
            timeline: "",
          });
          setTouched(new Set());
          setErrors({});
        } else {
          setStatus("error");
          setSubmitError(
            response.message ||
              "A apărut o eroare la trimiterea mesajului. Te rugăm să încerci din nou.",
          );
        }
      } catch (err: unknown) {
        setStatus("error");
        setSubmitError(
          err instanceof Error
            ? err.message
            : "Eroare de rețea. Verifică conexiunea și încearcă din nou.",
        );
      }
    },
    [formData],
  );

  /* ── Resetare după succes ── */
  const handleReset = useCallback(() => {
    setStatus("idle");
    setSubmitError(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      subject: "",
      message: "",
      budgetRange: "",
      timeline: "",
    });
    setTouched(new Set());
    setErrors({});
  }, []);

  /* ── Date contact ── */
  const contactInfo = settings?.contact;

  /* ── Număr total erori ── */
  const errorCount = Object.keys(errors).length;

  /* ── Loading state ── */
  if (!settings) {
    return (
      <section
        id={id}
        className={`relative py-section overflow-hidden ${className}`}
      >
        <div className="nexus-container">
          <div className="text-center space-y-4 mb-12">
            <div className="mx-auto h-8 w-48 bg-white/5 rounded animate-pulse" />
            <div className="mx-auto h-4 w-96 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
            <div className="lg:col-span-2 space-y-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-glass bg-glass-light border border-glass-border animate-pulse"
                />
              ))}
            </div>
            <div className="lg:col-span-3">
              <div className="rounded-glass bg-glass-light border border-glass-border p-8 h-[500px] animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ── Clasă helper pentru input-uri cu eroare ── */
  const inputClass = (field: keyof FormErrors) =>
    [
      "glass-input w-full transition-all duration-300",
      touched.has(field) && errors[field]
        ? "!border-red-400/60 !shadow-[0_0_0_3px_rgba(248,113,113,0.18)]"
        : touched.has(field) && !errors[field]
          ? "!border-green-400/40 !shadow-[0_0_0_3px_rgba(74,222,128,0.12)]"
          : "",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <section
      id={id}
      className={`relative py-section sm:py-section-lg overflow-hidden ${className}`}
    >
      {/* ═════════════════════════════════════════
          FUNDAL DECORATIV
          ═════════════════════════════════════════ */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-cover bg-center bg-fixed opacity-[0.05]"
        style={{ backgroundImage: "url('/images/contact-bg.jpg')" }}
      />

      <div
        aria-hidden="true"
        className="absolute bottom-0 right-0 w-[700px] h-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(108,60,225,0.12)_0%,transparent_70%)] pointer-events-none z-0"
      />
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.08)_0%,transparent_70%)] pointer-events-none z-0"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute top-32 right-[8%] w-1.5 h-1.5 bg-gold/20 rounded-full animate-float" />
        <div className="absolute bottom-40 left-[12%] w-1 h-1 bg-nexus-glow/25 rounded-full animate-float-delay" />
        <div className="absolute top-60 left-[20%] w-1 h-1 bg-gold/15 rounded-full animate-float" />
        <div className="absolute bottom-60 right-[15%] w-1.5 h-1.5 bg-nexus-accent/20 rounded-full animate-float-delay" />
      </div>

      {/* ═════════════════════════════════════════
          CONȚINUT
          ═════════════════════════════════════════ */}
      <div className="relative z-10 nexus-container">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="nexus-badge text-xs sm:text-sm py-1.5 px-4 mb-4 inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faGlobe} className="w-3 h-3 text-gold" />
            Hai să discutăm
          </span>
          <h2 className="mt-5 font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            <span className="text-nexus-gradient">Contact</span>
          </h2>
          <p className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
            Ai un proiect în minte? Completează formularul de mai jos și{" "}
            <span className="text-white/70 font-medium">
              îți răspund în cel mult 24 de ore
            </span>
            . Fiecare proiect începe cu o discuție — hai să vedem cum te pot ajuta.
          </p>
        </motion.div>

        {/* ═════════════════════════════════════════
            GRID: INFO + FORMULAR
            ═════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10 max-w-6xl mx-auto">
          {/* ═══ Coloana stângă: Info contact ═══ */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="lg:col-span-2 space-y-5"
          >
            <GlassCard
              variant="heavy"
              padding="lg"
              borderGlow="mixed"
              hoverEffect="none"
              highlight
              className="h-full"
            >
              <h3 className="font-heading text-lg sm:text-xl font-bold text-white mb-6 flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-nexus-accent/20 border border-nexus-accent/30 flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={faPaperPlane}
                    className="w-3.5 h-3.5 text-nexus-glow"
                  />
                </span>
                Informații de contact
              </h3>

              <ul className="space-y-5">
                {contactInfo?.email && (
                  <li className="flex items-start gap-3.5 group">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center transition-colors duration-300 group-hover:bg-gold/20 group-hover:border-gold/35">
                      <FontAwesomeIcon
                        icon={faEnvelope}
                        className="w-4 h-4 text-gold-light"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-white/35 font-mono tracking-wide uppercase mb-0.5">Email</p>
                      <a href={`mailto:${contactInfo.email}`} className="text-sm sm:text-base text-white/80 hover:text-gold-light transition-colors font-medium">
                        {contactInfo.email}
                      </a>
                    </div>
                  </li>
                )}
                {contactInfo?.phone && (
                  <li className="flex items-start gap-3.5 group">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-nexus-accent/10 border border-nexus-accent/20 flex items-center justify-center transition-colors duration-300 group-hover:bg-nexus-accent/20 group-hover:border-nexus-accent/35">
                      <FontAwesomeIcon icon={faPhone} className="w-4 h-4 text-nexus-glow" />
                    </div>
                    <div>
                      <p className="text-xs text-white/35 font-mono tracking-wide uppercase mb-0.5">Telefon</p>
                      <a href={`tel:${contactInfo.phone.replace(/\s/g, "")}`} className="text-sm sm:text-base text-white/80 hover:text-gold-light transition-colors font-medium">
                        {contactInfo.phone}
                      </a>
                    </div>
                  </li>
                )}
                {contactInfo?.address && (
                  <li className="flex items-start gap-3.5 group">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center transition-colors duration-300 group-hover:bg-gold/20 group-hover:border-gold/35">
                      <FontAwesomeIcon icon={faLocationDot} className="w-4 h-4 text-gold-light" />
                    </div>
                    <div>
                      <p className="text-xs text-white/35 font-mono tracking-wide uppercase mb-0.5">Locație</p>
                      <p className="text-sm sm:text-base text-white/80 font-medium">{contactInfo.address}</p>
                    </div>
                  </li>
                )}
                {contactInfo?.workingHours && (
                  <li className="flex items-start gap-3.5 group">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-nexus-accent/10 border border-nexus-accent/20 flex items-center justify-center transition-colors duration-300 group-hover:bg-nexus-accent/20 group-hover:border-nexus-accent/35">
                      <FontAwesomeIcon icon={faClock} className="w-4 h-4 text-nexus-glow" />
                    </div>
                    <div>
                      <p className="text-xs text-white/35 font-mono tracking-wide uppercase mb-0.5">Program</p>
                      <p className="text-sm sm:text-base text-white/80 font-medium">{contactInfo.workingHours}</p>
                    </div>
                  </li>
                )}
              </ul>

              <hr className="glass-divider my-6" />

              <div className="rounded-xl bg-nexus-accent/8 border border-nexus-accent/15 p-4">
                <p className="text-xs sm:text-sm text-white/55 leading-relaxed">
                  <span className="text-gold-light font-semibold">Timp de răspuns:</span>{" "}
                  Îți răspund în maxim 24 de ore, de obicei în aceeași zi lucrătoare.
                  Proiectele urgente beneficiază de prioritate.
                </p>
              </div>
            </GlassCard>
          </motion.div>

          {/* ═══ Coloana dreaptă: Formular ═══ */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="lg:col-span-3"
          >
            <GlassCard variant="heavy" padding="lg" borderGlow="nexus" hoverEffect="none" highlight>
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="text-center py-8 sm:py-12"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
                      className="w-20 h-20 mx-auto rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center mb-6"
                    >
                      <FontAwesomeIcon icon={faCheckCircle} className="w-10 h-10 text-green-400" />
                    </motion.div>
                    <h3 className="font-heading text-xl sm:text-2xl font-bold text-white mb-3">
                      Mesaj trimis cu succes!
                    </h3>
                    <p className="text-white/55 text-sm sm:text-base max-w-md mx-auto leading-relaxed mb-8">
                      Îți mulțumesc pentru mesaj! Îl voi citi și îți răspund în cel
                      mult 24 de ore. Între timp, poți arunca o privire peste
                      serviciile și portofoliul disponibil pe site.
                    </p>
                    <button type="button" onClick={handleReset} className="glass-btn px-6 py-3 text-sm sm:text-base group">
                      <FontAwesomeIcon icon={faMessage} className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                      <span>Trimite alt mesaj</span>
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center gap-3 mb-7">
                      <span className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
                        <FontAwesomeIcon icon={faMessage} className="w-3.5 h-3.5 text-gold-light" />
                      </span>
                      <h3 className="font-heading text-lg sm:text-xl font-bold text-white">Lasă-mi un mesaj</h3>
                    </div>

                    {/* Banner eroare submit */}
                    {status === "error" && submitError && (
                      <motion.div
                        ref={errorRef}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 rounded-xl bg-red-500/8 border border-red-500/20 flex items-start gap-3"
                        role="alert"
                        tabIndex={-1}
                      >
                        <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-red-300 font-medium">Eroare la trimitere</p>
                          <p className="text-xs text-red-300/70 mt-0.5">{submitError}</p>
                        </div>
                      </motion.div>
                    )}

                    {/* Banner erori validare */}
                    {errorCount > 0 && status !== "submitting" && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 rounded-xl bg-amber-500/6 border border-amber-500/15 flex items-start gap-3"
                        role="alert"
                      >
                        <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-amber-200 font-medium">
                            {errorCount} câmp{errorCount !== 1 ? "uri" : ""}{" "}
                            {errorCount !== 1 ? "necesită" : "necesită"} atenție
                          </p>
                          <p className="text-xs text-amber-200/60 mt-0.5">
                            Completează câmpurile marcate pentru a trimite mesajul.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
                      {/* Rând Nume + Email */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                        <div>
                          <label htmlFor="contact-name" className="block text-xs sm:text-sm text-white/45 font-medium mb-1.5">
                            Nume complet <span className="text-red-400">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
                              <FontAwesomeIcon icon={faUser} className="w-3.5 h-3.5" />
                            </div>
                            <input
                              id="contact-name" type="text" name="name"
                              value={formData.name} onChange={handleChange} onBlur={handleBlur}
                              placeholder="Numele tău"
                              className={`${inputClass("name")} pl-10`}
                              autoComplete="name" disabled={status === "submitting"}
                              aria-invalid={touched.has("name") && !!errors.name}
                              aria-describedby={errors.name ? "err-name" : undefined}
                            />
                          </div>
                          {touched.has("name") && errors.name && (
                            <p id="err-name" className="mt-1.5 text-xs text-red-400/90 flex items-center gap-1" role="alert">
                              <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3 flex-shrink-0" />
                              {errors.name}
                            </p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="contact-email" className="block text-xs sm:text-sm text-white/45 font-medium mb-1.5">
                            Email <span className="text-red-400">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
                              <FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />
                            </div>
                            <input
                              id="contact-email" type="email" name="email"
                              value={formData.email} onChange={handleChange} onBlur={handleBlur}
                              placeholder="email@exemplu.ro"
                              className={`${inputClass("email")} pl-10`}
                              autoComplete="email" disabled={status === "submitting"}
                              aria-invalid={touched.has("email") && !!errors.email}
                              aria-describedby={errors.email ? "err-email" : undefined}
                            />
                          </div>
                          {touched.has("email") && errors.email && (
                            <p id="err-email" className="mt-1.5 text-xs text-red-400/90 flex items-center gap-1" role="alert">
                              <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3 flex-shrink-0" />
                              {errors.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Rând Telefon + Companie */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                        <div>
                          <label htmlFor="contact-phone" className="block text-xs sm:text-sm text-white/45 font-medium mb-1.5">
                            Telefon <span className="text-white/20 text-[10px]">(opțional)</span>
                          </label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
                              <FontAwesomeIcon icon={faPhone} className="w-3.5 h-3.5" />
                            </div>
                            <input
                              id="contact-phone" type="tel" name="phone"
                              value={formData.phone} onChange={handleChange} onBlur={handleBlur}
                              placeholder="+40 7xx xxx xxx"
                              className={`${inputClass("phone")} pl-10`}
                              autoComplete="tel" disabled={status === "submitting"}
                              aria-invalid={touched.has("phone") && !!errors.phone}
                              aria-describedby={errors.phone ? "err-phone" : undefined}
                            />
                          </div>
                          {touched.has("phone") && errors.phone && (
                            <p id="err-phone" className="mt-1.5 text-xs text-red-400/90 flex items-center gap-1" role="alert">
                              <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3 flex-shrink-0" />
                              {errors.phone}
                            </p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="contact-company" className="block text-xs sm:text-sm text-white/45 font-medium mb-1.5">
                            Companie <span className="text-white/20 text-[10px]">(opțional)</span>
                          </label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
                              <FontAwesomeIcon icon={faBuilding} className="w-3.5 h-3.5" />
                            </div>
                            <input
                              id="contact-company" type="text" name="company"
                              value={formData.company} onChange={handleChange} onBlur={handleBlur}
                              placeholder="Numele companiei"
                              className={`${inputClass("subject")} pl-10`}
                              autoComplete="organization" disabled={status === "submitting"}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Subiect */}
                      <div>
                        <label htmlFor="contact-subject" className="block text-xs sm:text-sm text-white/45 font-medium mb-1.5">
                          Subiect <span className="text-white/20 text-[10px]">(opțional)</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
                            <FontAwesomeIcon icon={faTag} className="w-3.5 h-3.5" />
                          </div>
                          <input
                            id="contact-subject" type="text" name="subject"
                            value={formData.subject} onChange={handleChange} onBlur={handleBlur}
                            placeholder="Despre ce este vorba?"
                            className={`${inputClass("subject")} pl-10`}
                            disabled={status === "submitting"}
                          />
                        </div>
                      </div>

                      {/* Rând Buget + Timeline */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                        <div>
                          <label htmlFor="contact-budget" className="block text-xs sm:text-sm text-white/45 font-medium mb-1.5">
                            Buget estimativ <span className="text-white/20 text-[10px]">(opțional)</span>
                          </label>
                          <select
                            id="contact-budget" name="budgetRange"
                            value={formData.budgetRange} onChange={handleChange} onBlur={handleBlur}
                            className="glass-input w-full appearance-none cursor-pointer"
                            disabled={status === "submitting"}
                          >
                            {BUDGET_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value} className="bg-nexus-dark text-white">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="contact-timeline" className="block text-xs sm:text-sm text-white/45 font-medium mb-1.5">
                            Termen estimativ <span className="text-white/20 text-[10px]">(opțional)</span>
                          </label>
                          <select
                            id="contact-timeline" name="timeline"
                            value={formData.timeline} onChange={handleChange} onBlur={handleBlur}
                            className="glass-input w-full appearance-none cursor-pointer"
                            disabled={status === "submitting"}
                          >
                            {TIMELINE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value} className="bg-nexus-dark text-white">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Mesaj */}
                      <div>
                        <label htmlFor="contact-message" className="block text-xs sm:text-sm text-white/45 font-medium mb-1.5">
                          Mesaj <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          id="contact-message" name="message"
                          value={formData.message} onChange={handleChange} onBlur={handleBlur}
                          placeholder="Descrie proiectul tău — cu cât mai multe detalii, cu atât mai bine te pot ajuta..."
                          rows={5}
                          className={`${inputClass("message")} resize-y min-h-[120px]`}
                          autoComplete="off" disabled={status === "submitting"}
                          aria-invalid={touched.has("message") && !!errors.message}
                          aria-describedby={errors.message ? "err-message" : undefined}
                        />
                        {touched.has("message") && errors.message && (
                          <p id="err-message" className="mt-1.5 text-xs text-red-400/90 flex items-center gap-1" role="alert">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3 flex-shrink-0" />
                            {errors.message}
                          </p>
                        )}
                        <p className="mt-1.5 text-[10px] sm:text-xs text-white/20 text-right font-mono">
                          {formData.message.length} caractere
                          {formData.message.length > 0 && formData.message.length < 10 && (
                            <span className="text-red-400/60 ml-1">(minim 10)</span>
                          )}
                        </p>
                      </div>

                      {/* Buton submit */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={status === "submitting"}
                          className={[
                            "w-full glass-btn px-6 py-3.5 sm:py-4 text-sm sm:text-base font-semibold group",
                            "transition-all duration-300",
                            status === "submitting"
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:scale-[1.02] active:scale-[0.98]",
                          ].join(" ")}
                        >
                          {status === "submitting" ? (
                            <>
                              <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                              <span>Se trimite...</span>
                            </>
                          ) : (
                            <>
                              <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                              <span>Trimite mesajul</span>
                              <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                            </>
                          )}
                        </button>
                        <p className="mt-3 text-[10px] sm:text-xs text-white/20 text-center">
                          Prin trimiterea acestui formular, ești de acord cu{" "}
                          <a href="#" className="text-white/35 hover:text-nexus-glow transition-colors underline underline-offset-2">
                            politica de confidențialitate
                          </a>
                          . Datele tale sunt în siguranță și nu vor fi distribuite.
                        </p>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>
        </div>

        {/* ═════════════════════════════════════════
            CTA ALTERNATIV
            ═════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, delay: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="mt-12 sm:mt-16 text-center"
        >
          <div className="inline-block glass-heavy rounded-glass-lg p-6 sm:p-8 border border-white/8 max-w-xl">
            <p className="text-white/55 text-sm sm:text-base mb-4 leading-relaxed">
              Preferi un mesaj direct?{" "}
              <span className="text-white font-semibold">Scrie-mi pe email</span>{" "}
              și îți răspund personal în aceeași zi.
            </p>
            <a
              href={`mailto:${contactInfo?.email || "contact@nexusdevstudio.ro"}`}
              className="glass-btn-gold px-6 py-3 sm:px-8 sm:py-4 group text-sm sm:text-base"
            >
              <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
              <span>{contactInfo?.email || "contact@nexusdevstudio.ro"}</span>
            </a>
          </div>
        </motion.div>
      </div>

      {/* Gradient tranziție jos */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 z-[2] h-24 sm:h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(13,10,26,0.6) 0%, transparent 100%)",
        }}
      />
    </section>
  );
}

/* ─────────────────────────────────────────────
   Exporturi denumite
   ───────────────────────────────────────────── */

export { validateForm, validateEmail, validatePhone, BUDGET_OPTIONS, TIMELINE_OPTIONS };
export type { FormErrors, FormStatus };