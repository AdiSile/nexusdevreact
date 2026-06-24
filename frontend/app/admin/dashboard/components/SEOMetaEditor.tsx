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
import type { SeoFallback, FooterFallback, FooterColumn } from "../../../../lib/fallback";

/* ═══════════════════════════════════════════════════════════════════════════
   SEOMetaEditor – Editor vizual pentru SEO metadata + Footer
   Oferă previzualizare live SERP, validare avansată și urmărire modificări.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────
   Tipuri
   ───────────────────────────────────────────────────────── */

interface SeoFormData {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  siteUrl: string;
  language: string;
  twitterHandle: string;
}

interface FooterLinkData {
  label: string;
  href: string;
}

interface FooterColumnData {
  title: string;
  links: FooterLinkData[];
}

interface FooterFormData {
  copyright: string;
  columns: FooterColumnData[];
}

interface FormErrors {
  [field: string]: string;
}

type PreviewMode = "serp" | "footer";
type DeviceMode = "desktop" | "mobile";

interface ChangeLogEntry {
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: number;
}

/* ─────────────────────────────────────────────────────────
   Constante
   ───────────────────────────────────────────────────────── */

const MAX_TITLE_LENGTH = 70;
const MAX_DESC_LENGTH = 160;
const MAX_KEYWORDS_COUNT = 15;
const VALID_LANGUAGES = [
  "ro", "en", "fr", "de", "es", "it", "pt", "ru", "bg", "hu",
];

const FOOTER_DEFAULTS: FooterColumnData[] = [
  {
    title: "Servicii",
    links: [
      { label: "Dezvoltare Web", href: "#services" },
      { label: "Aplicații Mobile", href: "#services" },
    ],
  },
  {
    title: "Companie",
    links: [
      { label: "Despre noi", href: "#hero" },
      { label: "Portofoliu", href: "#portfolio" },
    ],
  },
];

/* ─────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────── */

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function truncateText(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function formatSerpUrl(url: string): string {
  if (!url.trim()) return "https://nexusdevstudio.ro";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const path = u.pathname !== "/" ? u.pathname : "";
    const display = u.hostname.replace(/^www\./, "") + path;
    return display.length > 60 ? display.slice(0, 57) + "..." : display;
  } catch {
    return url.trim().length > 60 ? url.trim().slice(0, 57) + "..." : url.trim();
  }
}

function hasUrlChanged(oldUrl: string, newUrl: string): boolean {
  return oldUrl.trim() !== newUrl.trim();
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

/* ═════════════════════════════════════════════════════════
   Componenta principală
   ═════════════════════════════════════════════════════════ */

export interface SEOMetaEditorProps {
  /** Datele SEO curente */
  seoData: SeoFallback;
  /** Datele Footer curente */
  footerData: FooterFallback;
  /** Callback salvare SEO */
  onSaveSeo: (data: SeoFallback) => void;
  /** Callback salvare Footer */
  onSaveFooter: (data: FooterFallback) => void;
  /** Callback dirty */
  onDirty: () => void;
  /** Stare salvare */
  saving: boolean;
}

export default function SEOMetaEditor({
  seoData,
  footerData,
  onSaveSeo,
  onSaveFooter,
  onDirty,
  saving,
}: SEOMetaEditorProps) {
  /* ── Tab activ ── */
  const [activeTab, setActiveTab] = useState<"seo" | "footer">("seo");

  /* ── Stare formular SEO ── */
  const [seoForm, setSeoForm] = useState<SeoFormData>(() => ({
    title: seoData.title,
    description: seoData.description,
    keywords: seoData.keywords,
    ogImage: seoData.ogImage,
    siteUrl: seoData.siteUrl,
    language: seoData.language,
    twitterHandle: seoData.twitterHandle,
  }));

  /* ── Stare formular Footer ── */
  const [footerForm, setFooterForm] = useState<FooterFormData>(() => ({
    copyright: footerData.copyright,
    columns: footerData.columns.map((c) => ({
      title: c.title,
      links: c.links.map((l) => ({ ...l })),
    })),
  }));

  const [errors, setErrors] = useState<FormErrors>({});
  const [previewMode, setPreviewMode] = useState<PreviewMode>("serp");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [ogImageError, setOgImageError] = useState(false);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [showChanges, setShowChanges] = useState(false);

  const seoTitleRef = useRef<HTMLInputElement>(null);

  /* ── Sincronizare date externe ── */
  useEffect(() => {
    setSeoForm({
      title: seoData.title,
      description: seoData.description,
      keywords: seoData.keywords,
      ogImage: seoData.ogImage,
      siteUrl: seoData.siteUrl,
      language: seoData.language,
      twitterHandle: seoData.twitterHandle,
    });
    setErrors({});
    setOgImageError(false);
  }, [seoData]);

  useEffect(() => {
    setFooterForm({
      copyright: footerData.copyright,
      columns: footerData.columns.map((c) => ({
        title: c.title,
        links: c.links.map((l) => ({ ...l })),
      })),
    });
  }, [footerData]);

  /* ── Focus primul input la montare ── */
  useEffect(() => {
    seoTitleRef.current?.focus();
  }, []);

  /* ── Reset preview state când se schimbă OG image ── */
  useEffect(() => {
    setOgImageError(false);
  }, [seoForm.ogImage]);

  /* ── Actualizare câmp SEO generic ── */
  const updateSeo = useCallback(
    (field: string, value: string) => {
      setSeoForm((prev) => {
        const oldValue = String(prev[field as keyof SeoFormData] ?? "");
        const newValue = String(value);
        if (oldValue !== newValue) {
          setChangeLog((log) => [
            { field: `seo.${field}`, oldValue, newValue, timestamp: Date.now() },
            ...log.slice(0, 49),
          ]);
        }
        return { ...prev, [field]: value };
      });
      onDirty();
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`seo.${field}`];
        return next;
      });
    },
    [onDirty],
  );

  /* ── Actualizare copyright ── */
  const updateCopyright = useCallback(
    (value: string) => {
      setFooterForm((prev) => {
        const oldVal = prev.copyright;
        if (oldVal !== value) {
          setChangeLog((log) => [
            { field: "footer.copyright", oldValue: oldVal, newValue: value, timestamp: Date.now() },
            ...log.slice(0, 49),
          ]);
        }
        return { ...prev, copyright: value };
      });
      onDirty();
    },
    [onDirty],
  );

  /* ── Actualizare titlu coloană ── */
  const updateColumnTitle = useCallback(
    (colIdx: number, value: string) => {
      setFooterForm((prev) => {
        const cols = [...prev.columns];
        const oldVal = cols[colIdx].title;
        if (oldVal !== value) {
          setChangeLog((log) => [
            { field: `footer.col[${colIdx}].title`, oldValue: oldVal, newValue: value, timestamp: Date.now() },
            ...log.slice(0, 49),
          ]);
        }
        cols[colIdx] = { ...cols[colIdx], title: value };
        return { ...prev, columns: cols };
      });
      onDirty();
    },
    [onDirty],
  );

  /* ── Actualizare link din coloană ── */
  const updateLink = useCallback(
    (colIdx: number, linkIdx: number, linkField: "label" | "href", value: string) => {
      setFooterForm((prev) => {
        const cols = [...prev.columns];
        const links = [...cols[colIdx].links];
        const oldVal = links[linkIdx][linkField];
        if (oldVal !== value) {
          setChangeLog((log) => [
            {
              field: `footer.col[${colIdx}].link[${linkIdx}].${linkField}`,
              oldValue: oldVal,
              newValue: value,
              timestamp: Date.now(),
            },
            ...log.slice(0, 49),
          ]);
        }
        links[linkIdx] = { ...links[linkIdx], [linkField]: value };
        cols[colIdx] = { ...cols[colIdx], links };
        return { ...prev, columns: cols };
      });
      onDirty();
    },
    [onDirty],
  );

  /* ── Adaugă link nou în coloană ── */
  const addLink = useCallback(
    (colIdx: number) => {
      setFooterForm((prev) => {
        const cols = [...prev.columns];
        const links = [...cols[colIdx].links, { label: "", href: "#" }];
        cols[colIdx] = { ...cols[colIdx], links };
        return { ...prev, columns: cols };
      });
      onDirty();
    },
    [onDirty],
  );

  /* ── Șterge link din coloană ── */
  const removeLink = useCallback(
    (colIdx: number, linkIdx: number) => {
      setFooterForm((prev) => {
        const cols = [...prev.columns];
        const links = cols[colIdx].links.filter((_, i) => i !== linkIdx);
        cols[colIdx] = { ...cols[colIdx], links };
        return { ...prev, columns: cols };
      });
      onDirty();
    },
    [onDirty],
  );

  /* ── Adaugă coloană nouă ── */
  const addColumn = useCallback(() => {
    setFooterForm((prev) => ({
      ...prev,
      columns: [
        ...prev.columns,
        { title: "Coloană nouă", links: [{ label: "Link nou", href: "#" }] },
      ],
    }));
    onDirty();
  }, [onDirty]);

  /* ── Șterge coloană ── */
  const removeColumn = useCallback(
    (colIdx: number) => {
      setFooterForm((prev) => ({
        ...prev,
        columns: prev.columns.filter((_, i) => i !== colIdx),
      }));
      onDirty();
    },
    [onDirty],
  );

  /* ── Validare ── */
  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};

    // SEO validation
    if (!seoForm.title.trim()) {
      errs["seo.title"] = "Meta titlul este obligatoriu.";
    } else if (seoForm.title.trim().length > MAX_TITLE_LENGTH) {
      errs["seo.title"] = `Meta titlul depășește ${MAX_TITLE_LENGTH} caractere (${seoForm.title.trim().length}).`;
    }

    if (!seoForm.description.trim()) {
      errs["seo.description"] = "Meta descrierea este obligatorie.";
    } else if (seoForm.description.trim().length > MAX_DESC_LENGTH) {
      errs["seo.description"] = `Meta descrierea depășește ${MAX_DESC_LENGTH} caractere (${seoForm.description.trim().length}).`;
    }

    if (seoForm.keywords.trim()) {
      const kwCount = seoForm.keywords.split(",").filter((k) => k.trim()).length;
      if (kwCount > MAX_KEYWORDS_COUNT) {
        errs["seo.keywords"] = `Maxim ${MAX_KEYWORDS_COUNT} cuvinte cheie recomandate (ai ${kwCount}).`;
      }
    }

    const urlPattern = /^https?:\/\/.+/i;
    if (seoForm.siteUrl.trim() && !urlPattern.test(seoForm.siteUrl.trim())) {
      errs["seo.siteUrl"] = "URL-ul site-ului trebuie să fie valid (ex: https://nexusdevstudio.ro).";
    }

    if (seoForm.ogImage.trim() && !urlPattern.test(seoForm.ogImage.trim()) && !seoForm.ogImage.trim().startsWith("/")) {
      errs["seo.ogImage"] = "URL-ul imaginii OG trebuie să fie valid sau o cale relativă.";
    }

    if (seoForm.language.trim() && !VALID_LANGUAGES.includes(seoForm.language.trim().toLowerCase())) {
      errs["seo.language"] = `Codul de limbă pare nestandard. Coduri acceptate: ${VALID_LANGUAGES.join(", ")}.`;
    }

    if (seoForm.twitterHandle.trim() && !seoForm.twitterHandle.trim().startsWith("@")) {
      errs["seo.twitterHandle"] = "Handle-ul Twitter trebuie să înceapă cu @.";
    }

    // Footer validation
    if (!footerForm.copyright.trim()) {
      errs["footer.copyright"] = "Textul de copyright este obligatoriu.";
    }

    footerForm.columns.forEach((col, colIdx) => {
      if (!col.title.trim()) {
        errs[`footer.col[${colIdx}].title`] = "Titlul coloanei este obligatoriu.";
      }
      col.links.forEach((link, linkIdx) => {
        if (!link.label.trim()) {
          errs[`footer.col[${colIdx}].link[${linkIdx}].label`] = "Label-ul link-ului este obligatoriu.";
        }
        if (!link.href.trim()) {
          errs[`footer.col[${colIdx}].link[${linkIdx}].href`] = "URL-ul link-ului este obligatoriu.";
        }
      });
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [seoForm, footerForm]);

  /* ── Submit combinat ── */
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      // Salvează SEO
      const cleanedSeo: SeoFallback = {
        title: seoForm.title.trim(),
        description: seoForm.description.trim(),
        keywords: seoForm.keywords.trim(),
        ogImage: seoForm.ogImage.trim(),
        siteUrl: seoForm.siteUrl.trim(),
        language: seoForm.language.trim().toLowerCase(),
        twitterHandle: seoForm.twitterHandle.trim(),
      };
      onSaveSeo(cleanedSeo);

      // Salvează Footer
      const cleanedFooter: FooterFallback = {
        copyright: footerForm.copyright.trim(),
        columns: footerForm.columns.map((c) => ({
          title: c.title.trim(),
          links: c.links.map((l) => ({
            label: l.label.trim(),
            href: l.href.trim(),
          })),
        })),
      };
      onSaveFooter(cleanedFooter);

      setChangeLog([]);
    },
    [seoForm, footerForm, validate, onSaveSeo, onSaveFooter],
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

  const inputClassSm = (field: string) =>
    `w-full bg-white/[0.04] border rounded-lg px-3 py-2 text-white text-xs placeholder:text-white/20 
     outline-none transition-all duration-200 font-sans ${
       errors[field]
         ? "border-red-400/60 focus:border-red-400/70 focus:ring-1 focus:ring-red-400/20"
         : "border-glass-border focus:border-nexus-glow/40 focus:ring-1 focus:ring-nexus-glow/10 hover:border-glass-border-strong"
     }`;

  /* ── SERP URL display ── */
  const serpUrl = formatSerpUrl(seoForm.siteUrl);

  /* ── Copyright rendered ── */
  const renderedCopyright = footerForm.copyright.replace("{year}", String(getCurrentYear()));

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
          {/* ── Header formular cu tab-uri și indicatori ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                SEO &amp; Footer
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

          {/* ── Tab switcher SEO / Footer ── */}
          <div className="flex rounded-xl border border-glass-border overflow-hidden bg-white/[0.02]">
            <button
              type="button"
              onClick={() => {
                setActiveTab("seo");
                setPreviewMode("serp");
              }}
              className={`flex-1 px-4 py-2.5 text-xs font-semibold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === "seo"
                  ? "bg-nexus-accent/20 text-nexus-glow border-r border-glass-border"
                  : "text-white/35 hover:text-white/60 hover:bg-white/[0.03] border-r border-glass-border"
              }`}
            >
              <i className="fa-solid fa-magnifying-glass text-[10px]" />
              SEO Meta
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("footer");
                setPreviewMode("footer");
              }}
              className={`flex-1 px-4 py-2.5 text-xs font-semibold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === "footer"
                  ? "bg-nexus-accent/20 text-nexus-glow"
                  : "text-white/35 hover:text-white/60 hover:bg-white/[0.03]"
              }`}
            >
              <i className="fa-solid fa-section text-[10px]" />
              Footer
            </button>
          </div>

          {/* ═════════════════════════════════════════
              SECȚIUNEA SEO
              ═════════════════════════════════════════ */}
          <AnimatePresence mode="wait">
            {activeTab === "seo" && (
              <motion.div
                key="seo-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="space-y-4"
              >
                {/* Identitate SEO */}
                <fieldset className="space-y-4">
                  <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-globe text-[10px] text-nexus-glow/60" />
                    Meta Date Principale
                  </legend>

                  <Field
                    label="Meta Titlu"
                    field="seo-title"
                    error={errors["seo.title"]}
                    required
                  >
                    <input
                      ref={seoTitleRef}
                      id="seo-title"
                      type="text"
                      value={seoForm.title}
                      onChange={(e) => updateSeo("title", e.target.value)}
                      placeholder="Nexus Dev Studio | Dezvoltare Web Modernă"
                      className={inputClass("seo.title")}
                      aria-required="true"
                      aria-invalid={!!errors["seo.title"]}
                      aria-describedby={errors["seo.title"] ? "seo-title-err" : "seo-title-hint"}
                    />
                    <CharCount current={seoForm.title.length} max={MAX_TITLE_LENGTH} id="seo-title-hint" />
                  </Field>

                  <Field
                    label="Meta Descriere"
                    field="seo-desc"
                    error={errors["seo.description"]}
                    required
                  >
                    <textarea
                      id="seo-desc"
                      rows={3}
                      value={seoForm.description}
                      onChange={(e) => updateSeo("description", e.target.value)}
                      placeholder="Descrierea pentru motoarele de căutare (max 160 caractere)..."
                      className={`${inputClass("seo.description")} resize-none`}
                      aria-required="true"
                      aria-invalid={!!errors["seo.description"]}
                      aria-describedby={errors["seo.description"] ? "seo-desc-err" : "seo-desc-hint"}
                    />
                    <CharCount current={seoForm.description.length} max={MAX_DESC_LENGTH} id="seo-desc-hint" />
                  </Field>

                  <Field
                    label="Cuvinte Cheie"
                    field="seo-kw"
                    error={errors["seo.keywords"]}
                  >
                    <input
                      id="seo-kw"
                      type="text"
                      value={seoForm.keywords}
                      onChange={(e) => updateSeo("keywords", e.target.value)}
                      placeholder="dezvoltare web, next.js, react, full-stack"
                      className={inputClass("seo.keywords")}
                      aria-describedby="seo-kw-hint"
                    />
                    <p id="seo-kw-hint" className="text-[10px] text-white/25 mt-1.5 font-mono">
                      Separate prin virgulă. Maxim {MAX_KEYWORDS_COUNT} recomandate. Curent:{" "}
                      {seoForm.keywords.split(",").filter((k) => k.trim()).length}
                    </p>
                  </Field>
                </fieldset>

                {/* Social & Open Graph */}
                <fieldset className="space-y-4">
                  <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-share-nodes text-[10px] text-nexus-glow/60" />
                    Open Graph &amp; Social
                  </legend>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="OG Image URL"
                      field="seo-og"
                      error={errors["seo.ogImage"]}
                    >
                      <input
                        id="seo-og"
                        type="text"
                        value={seoForm.ogImage}
                        onChange={(e) => updateSeo("ogImage", e.target.value)}
                        placeholder="/images/og-image.jpg"
                        className={inputClass("seo.ogImage")}
                      />
                      <p className="text-[10px] text-white/25 mt-1.5 font-mono">
                        Imaginea afișată la share pe Facebook, LinkedIn, etc. (1200×630 px recomandat).
                      </p>
                    </Field>
                    <Field
                      label="Site URL"
                      field="seo-url"
                      error={errors["seo.siteUrl"]}
                    >
                      <input
                        id="seo-url"
                        type="url"
                        value={seoForm.siteUrl}
                        onChange={(e) => updateSeo("siteUrl", e.target.value)}
                        placeholder="https://nexusdevstudio.ro"
                        className={inputClass("seo.siteUrl")}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Limbă"
                      field="seo-lang"
                      error={errors["seo.language"]}
                    >
                      <input
                        id="seo-lang"
                        type="text"
                        value={seoForm.language}
                        onChange={(e) => updateSeo("language", e.target.value)}
                        placeholder="ro"
                        maxLength={5}
                        className={inputClass("seo.language")}
                      />
                      <p className="text-[10px] text-white/25 mt-1.5 font-mono">
                        Cod ISO 639-1: ro, en, fr, de, es, etc.
                      </p>
                    </Field>
                    <Field
                      label="Twitter Handle"
                      field="seo-tw"
                      error={errors["seo.twitterHandle"]}
                    >
                      <input
                        id="seo-tw"
                        type="text"
                        value={seoForm.twitterHandle}
                        onChange={(e) => updateSeo("twitterHandle", e.target.value)}
                        placeholder="@nexusdevstudio"
                        className={inputClass("seo.twitterHandle")}
                      />
                    </Field>
                  </div>
                </fieldset>
              </motion.div>
            )}

            {/* ═════════════════════════════════════════
                SECȚIUNEA FOOTER
                ═════════════════════════════════════════ */}
            {activeTab === "footer" && (
              <motion.div
                key="footer-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="space-y-4"
              >
                {/* Copyright */}
                <fieldset className="space-y-4">
                  <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-copyright text-[10px] text-nexus-glow/60" />
                    Copyright
                  </legend>

                  <Field
                    label="Text Copyright"
                    field="footer-copyright"
                    error={errors["footer.copyright"]}
                    required
                  >
                    <input
                      id="footer-copyright"
                      type="text"
                      value={footerForm.copyright}
                      onChange={(e) => updateCopyright(e.target.value)}
                      placeholder="{year} Nexus Dev Studio. Toate drepturile rezervate."
                      className={inputClass("footer.copyright")}
                      aria-required="true"
                    />
                    <p className="text-[10px] text-white/25 mt-1.5 font-mono">
                      Folosește {"{year}"} pentru anul curent. Preview: {renderedCopyright}
                    </p>
                  </Field>
                </fieldset>

                {/* Coloane footer */}
                <fieldset className="space-y-4">
                  <div className="flex items-center justify-between mb-3">
                    <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-columns text-[10px] text-nexus-glow/60" />
                      Coloane de Navigare
                    </legend>
                    <button
                      type="button"
                      onClick={addColumn}
                      className="flex items-center gap-1.5 text-[10px] font-medium text-nexus-glow/70 hover:text-nexus-glow bg-nexus-accent/10 hover:bg-nexus-accent/20 border border-nexus-accent/20 rounded-full px-3 py-1 transition-all duration-200"
                    >
                      <i className="fa-solid fa-plus text-[9px]" />
                      Adaugă coloană
                    </button>
                  </div>

                  {footerForm.columns.map((col, colIdx) => (
                    <div
                      key={colIdx}
                      className="p-4 rounded-glass border border-glass-border bg-white/[0.02] relative group/column"
                    >
                      {/* Header coloană */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 rounded-md bg-nexus-accent/15 border border-nexus-accent/25 flex items-center justify-center text-[10px] font-bold text-nexus-glow flex-shrink-0">
                          {colIdx + 1}
                        </span>
                        <div className="flex-1">
                          <Field
                            label=""
                            field={`footer-col-${colIdx}-title`}
                            error={errors[`footer.col[${colIdx}].title`]}
                          >
                            <input
                              id={`footer-col-${colIdx}-title`}
                              type="text"
                              value={col.title}
                              onChange={(e) => updateColumnTitle(colIdx, e.target.value)}
                              placeholder="Servicii"
                              className={inputClass(`footer.col[${colIdx}].title`)}
                            />
                          </Field>
                        </div>

                        {/* Buton ștergere coloană */}
                        {footerForm.columns.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeColumn(colIdx)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-400/20 transition-all duration-200 flex-shrink-0"
                            title="Șterge coloana"
                          >
                            <i className="fa-solid fa-trash-can text-[10px]" />
                          </button>
                        )}
                      </div>

                      {/* Linkuri */}
                      <div className="space-y-2 ml-8">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">
                            Linkuri ({col.links.length})
                          </p>
                          <button
                            type="button"
                            onClick={() => addLink(colIdx)}
                            className="text-[10px] text-nexus-glow/50 hover:text-nexus-glow transition-colors"
                          >
                            <i className="fa-solid fa-plus text-[9px] mr-1" />
                            Adaugă link
                          </button>
                        </div>

                        {col.links.map((link, linkIdx) => (
                          <div
                            key={linkIdx}
                            className="flex items-start gap-2"
                          >
                            <span className="text-[10px] text-white/15 font-mono mt-2.5 flex-shrink-0">
                              {linkIdx + 1}.
                            </span>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-2">
                              <div className="sm:col-span-2">
                                <input
                                  id={`footer-col-${colIdx}-link-${linkIdx}-label`}
                                  type="text"
                                  value={link.label}
                                  onChange={(e) =>
                                    updateLink(colIdx, linkIdx, "label", e.target.value)
                                  }
                                  placeholder="Label"
                                  className={inputClassSm(
                                    `footer.col[${colIdx}].link[${linkIdx}].label`,
                                  )}
                                />
                                {errors[`footer.col[${colIdx}].link[${linkIdx}].label`] && (
                                  <p className="mt-0.5 text-[9px] text-red-400/70">
                                    {errors[`footer.col[${colIdx}].link[${linkIdx}].label`]}
                                  </p>
                                )}
                              </div>
                              <div className="sm:col-span-2">
                                <input
                                  id={`footer-col-${colIdx}-link-${linkIdx}-href`}
                                  type="text"
                                  value={link.href}
                                  onChange={(e) =>
                                    updateLink(colIdx, linkIdx, "href", e.target.value)
                                  }
                                  placeholder="#services"
                                  className={inputClassSm(
                                    `footer.col[${colIdx}].link[${linkIdx}].href`,
                                  )}
                                />
                                {errors[`footer.col[${colIdx}].link[${linkIdx}].href`] && (
                                  <p className="mt-0.5 text-[9px] text-red-400/70">
                                    {errors[`footer.col[${colIdx}].link[${linkIdx}].href`]}
                                  </p>
                                )}
                              </div>
                              <div className="sm:col-span-1 flex items-center justify-end sm:justify-center">
                                {col.links.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeLink(colIdx, linkIdx)}
                                    className="w-6 h-6 rounded flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                                    title="Șterge link"
                                  >
                                    <i className="fa-solid fa-xmark text-[9px]" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {col.links.length === 0 && (
                          <p className="text-[10px] text-white/15 italic ml-5">
                            Nicio legătură în această coloană. Adaugă una folosind butonul de mai sus.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {footerForm.columns.length === 0 && (
                    <div className="rounded-glass border border-glass-border bg-white/[0.02] p-8 text-center">
                      <i className="fa-solid fa-columns text-2xl text-white/10 mb-3 block" />
                      <p className="text-xs text-white/25 font-mono">
                        Nicio coloană de footer. Adaugă una folosind butonul de mai sus.
                      </p>
                    </div>
                  )}
                </fieldset>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Submit Button ── */}
          <SubmitButton saving={saving} hasErrors={Object.keys(errors).length > 0} />
        </form>
      </div>

      {/* ═════════════════════════════════════════
          PREVIZUALIZARE LIVE – Dreapta
          ═════════════════════════════════════════ */}
      <div className="xl:w-[460px] flex-shrink-0">
        <div className="sticky top-24 space-y-4">
          {/* Header preview */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-eye text-[10px] text-nexus-glow/60" />
              Previzualizare Live
            </h3>

            {/* Toggle mod preview + device */}
            <div className="flex items-center gap-2">
              {activeTab === "seo" ? (
                <span className="text-[9px] text-white/25 font-mono bg-white/[0.03] border border-glass-border rounded-full px-2.5 py-1">
                  SERP Google
                </span>
              ) : (
                <span className="text-[9px] text-white/25 font-mono bg-white/[0.03] border border-glass-border rounded-full px-2.5 py-1">
                  Footer
                </span>
              )}
              <div className="flex rounded-lg border border-glass-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDeviceMode("desktop")}
                  className={`px-2.5 py-1.5 text-[10px] font-medium transition-all duration-200 ${
                    deviceMode === "desktop"
                      ? "bg-nexus-accent/20 text-nexus-glow"
                      : "text-white/35 hover:text-white/60"
                  }`}
                  aria-pressed={deviceMode === "desktop"}
                  aria-label="Previzualizare desktop"
                >
                  <i className="fa-solid fa-desktop" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode("mobile")}
                  className={`px-2.5 py-1.5 text-[10px] font-medium transition-all duration-200 ${
                    deviceMode === "mobile"
                      ? "bg-nexus-accent/20 text-nexus-glow"
                      : "text-white/35 hover:text-white/60"
                  }`}
                  aria-pressed={deviceMode === "mobile"}
                  aria-label="Previzualizare mobil"
                >
                  <i className="fa-solid fa-mobile-screen" />
                </button>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════
              PREVIEW: SERP Google
              ═════════════════════════════════════════ */}
          {activeTab === "seo" && (
            <AnimatePresence mode="wait">
              <motion.div
                key="serp-preview"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className={`rounded-glass-lg border border-glass-border bg-[#1a1a2e] overflow-hidden transition-all duration-300 ${
                    deviceMode === "mobile" ? "max-w-[340px] mx-auto" : "w-full"
                  }`}
                >
                  {/* Bara URL Google */}
                  <div className="px-4 py-2.5 border-b border-glass-border bg-[#111122]/50 flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400/30" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400/30" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/30" />
                    </div>
                    <div className="flex-1 mx-3 bg-white/[0.03] rounded-full px-3 py-1.5 flex items-center gap-2">
                      <i className="fa-solid fa-magnifying-glass text-[9px] text-white/20" />
                      <span className="text-[10px] text-white/25 font-mono truncate">
                        {seoForm.title.trim().slice(0, 40) || "nexusdevstudio.ro"}
                      </span>
                    </div>
                  </div>

                  {/* Rezultat SERP */}
                  <div className="px-5 py-5">
                    {/* URL breadcrumb */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-nexus-accent/15 border border-nexus-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[6px] font-bold text-nexus-glow/70">N</span>
                      </div>
                      <span className="text-[11px] text-[#8ab4f8] font-sans leading-none">
                        {serpUrl}
                      </span>
                      <i className="fa-solid fa-chevron-down text-[7px] text-[#8ab4f8]/60 ml-0.5" />
                    </div>

                    {/* Titlu SERP */}
                    <a
                      href={seoForm.siteUrl || "#"}
                      className="text-lg font-sans text-[#8ab4f8] hover:underline leading-tight block mb-1"
                      style={{ fontSize: deviceMode === "mobile" ? "15px" : "18px" }}
                      onClick={(e) => { if (!seoForm.siteUrl) e.preventDefault(); }}
                    >
                      {truncateText(seoForm.title.trim() || "Titlul SEO apare aici", MAX_TITLE_LENGTH)}
                    </a>

                    {/* Descriere SERP */}
                    <p
                      className="text-[13px] leading-relaxed text-[#bdc1c6] font-sans"
                      style={{ fontSize: deviceMode === "mobile" ? "12px" : "13px" }}
                    >
                      {seoForm.description.trim()
                        ? truncateText(seoForm.description, MAX_DESC_LENGTH)
                        : "Descrierea meta va apărea aici în rezultatele căutării. Optimizează textul pentru click-through rate."}
                    </p>

                    {/* Meta info suplimentar */}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-[#9aa0a6]">
                      {seoForm.language && (
                        <span className="flex items-center gap-1">
                          <i className="fa-solid fa-language text-[9px]" />
                          {seoForm.language.toUpperCase()}
                        </span>
                      )}
                      {seoForm.keywords && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <i className="fa-solid fa-tags text-[9px]" />
                          {seoForm.keywords.split(",").slice(0, 3).join(", ")}
                          {seoForm.keywords.split(",").length > 3 && " ..."}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* OG Preview Card (apare sub SERP) */}
                <div
                  className={`mt-4 rounded-glass-lg border border-glass-border overflow-hidden bg-[#1a1a2e] transition-all duration-300 ${
                    deviceMode === "mobile" ? "max-w-[340px] mx-auto" : "w-full"
                  }`}
                >
                  <div className="px-3 py-2 border-b border-glass-border bg-[#111122]/50 flex items-center gap-2">
                    <i className="fa-brands fa-facebook text-[#1877F2] text-xs" />
                    <span className="text-[10px] text-white/25 font-mono uppercase tracking-wider">
                      Open Graph Preview
                    </span>
                  </div>

                  {/* Imagine OG */}
                  <div className="relative aspect-[1.91/1] bg-nexus-dark overflow-hidden border-b border-glass-border">
                    {seoForm.ogImage.trim() ? (
                      <img
                        src={seoForm.ogImage}
                        alt="OG Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={() => setOgImageError(true)}
                        onLoad={() => setOgImageError(false)}
                      />
                    ) : (
                      <img
                        src="/images/seo-editor-bg.jpg"
                        alt="OG Preview fallback"
                        className="absolute inset-0 w-full h-full object-cover opacity-40"
                      />
                    )}
                    {ogImageError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-nexus-dark/80">
                        <div className="text-center">
                          <i className="fa-solid fa-image-slash text-white/20 text-xl mb-1 block" />
                          <span className="text-[10px] text-white/30 font-mono">
                            Imaginea nu s-a putut încărca
                          </span>
                        </div>
                      </div>
                    )}
                    {!seoForm.ogImage.trim() && (
                      <div className="absolute inset-0 flex items-center justify-center bg-nexus-dark/40">
                        <span className="text-[10px] text-white/25 font-mono bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
                          Setează OG Image
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Text OG card */}
                  <div className="px-4 py-3">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium mb-1">
                      {serpUrl}
                    </p>
                    <p className="text-sm font-semibold text-white/85 leading-snug mb-1">
                      {truncateText(seoForm.title.trim() || "Titlu Open Graph", 60)}
                    </p>
                    <p className="text-[11px] text-white/45 leading-relaxed line-clamp-2">
                      {seoForm.description.trim()
                        ? truncateText(seoForm.description, 120)
                        : "Descrierea Open Graph. Apare când distribui link-ul pe rețele sociale."}
                    </p>
                  </div>
                </div>

                {/* Twitter Card Preview */}
                {seoForm.twitterHandle.trim() && (
                  <div
                    className={`mt-4 rounded-glass-lg border border-glass-border overflow-hidden bg-[#1a1a2e] transition-all duration-300 ${
                      deviceMode === "mobile" ? "max-w-[340px] mx-auto" : "w-full"
                    }`}
                  >
                    <div className="px-3 py-2 border-b border-glass-border bg-[#111122]/50 flex items-center gap-2">
                      <i className="fa-brands fa-x-twitter text-white text-xs" />
                      <span className="text-[10px] text-white/25 font-mono uppercase tracking-wider">
                        Twitter Card
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm font-semibold text-white/85 leading-snug">
                        {truncateText(seoForm.title.trim() || "Twitter Card Title", 50)}
                      </p>
                      <p className="text-[11px] text-white/45 leading-relaxed mt-1">
                        {seoForm.description.trim()
                          ? truncateText(seoForm.description, 100)
                          : "Summary card description."}
                      </p>
                      <p className="text-[10px] text-white/20 mt-2 font-mono">
                        {seoForm.twitterHandle} · {serpUrl}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* ═════════════════════════════════════════
              PREVIEW: Footer
              ═════════════════════════════════════════ */}
          {activeTab === "footer" && (
            <AnimatePresence mode="wait">
              <motion.div
                key="footer-preview"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className={`rounded-glass-lg border border-glass-border overflow-hidden bg-[#0B0A14] transition-all duration-300 ${
                    deviceMode === "mobile" ? "max-w-[340px] mx-auto" : "w-full"
                  }`}
                >
                  {/* Conținut footer */}
                  <div className="px-5 py-6">
                    {/* Grid coloane */}
                    <div
                      className={`grid gap-6 mb-6 ${
                        deviceMode === "mobile"
                          ? "grid-cols-1"
                          : footerForm.columns.length <= 2
                            ? "grid-cols-2"
                            : "grid-cols-3"
                      }`}
                    >
                      {footerForm.columns.map((col, colIdx) => (
                        <div key={colIdx}>
                          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">
                            {col.title || `Coloana ${colIdx + 1}`}
                          </h4>
                          <ul className="space-y-2">
                            {col.links.map((link, linkIdx) => (
                              <li key={linkIdx}>
                                <a
                                  href={link.href || "#"}
                                  className="text-[11px] text-white/40 hover:text-nexus-glow transition-colors duration-200"
                                  onClick={(e) => {
                                    if (!link.href) e.preventDefault();
                                  }}
                                >
                                  {link.label || `Link ${linkIdx + 1}`}
                                </a>
                              </li>
                            ))}
                            {col.links.length === 0 && (
                              <li className="text-[10px] text-white/15 italic">
                                Fără linkuri
                              </li>
                            )}
                          </ul>
                        </div>
                      ))}

                      {footerForm.columns.length === 0 && (
                        <div className="col-span-full text-center py-4">
                          <p className="text-[10px] text-white/20 font-mono">
                            Nicio coloană configurată
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Separator */}
                    <div className="border-t border-white/[0.06] pt-4">
                      {/* Copyright */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <p className="text-[11px] text-white/30 font-mono">
                          {renderedCopyright || "{year} Studio. Toate drepturile rezervate."}
                        </p>

                        {/* Social icons placeholder */}
                        <div className="flex items-center gap-2">
                          {["github", "linkedin", "twitter", "instagram"].map((s, i) => (
                            <div
                              key={s}
                              className="w-6 h-6 rounded-md bg-white/[0.03] border border-white/[0.06] flex items-center justify-center"
                            >
                              <i className={`fa-brands fa-${s} text-[10px] text-white/15`} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Linie decorativă */}
                      <div className="mt-3 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
                    </div>
                  </div>
                </div>

                {/* Structură footer info */}
                <div className="mt-3 rounded-xl border border-glass-border bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between text-[10px] text-white/25 font-mono">
                    <span>
                      {footerForm.columns.length} coloan{footerForm.columns.length === 1 ? "ă" : "e"}
                    </span>
                    <span>
                      {footerForm.columns.reduce((sum, c) => sum + c.links.length, 0)} linkuri
                    </span>
                    <span className="flex items-center gap-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          footerForm.copyright.includes("{year}")
                            ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.4)]"
                            : "bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.4)]"
                        }`}
                      />
                      {footerForm.copyright.includes("{year}") ? "Auto-year" : "Text fix"}
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* ── Sfaturi rapide ── */}
          <div className="rounded-xl border border-glass-border bg-white/[0.02] p-4">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">
              <i className="fa-solid fa-lightbulb text-gold/50 mr-1.5" />
              Sfaturi {activeTab === "seo" ? "SEO" : "Footer"}
            </p>
            {activeTab === "seo" ? (
              <ul className="space-y-2 text-[11px] text-white/40 leading-relaxed">
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                  Meta titlul ideal are între 50-60 caractere. Nu depăși {MAX_TITLE_LENGTH}.
                </li>
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                  Meta descrierea trebuie să fie un rezumat convingător, cu call-to-action.
                </li>
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                  OG Image trebuie să fie 1200×630 px pentru afișare optimă pe rețele sociale.
                </li>
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                  Folosește cuvinte cheie relevante, separate prin virgulă, fără umplutură (keyword stuffing).
                </li>
              </ul>
            ) : (
              <ul className="space-y-2 text-[11px] text-white/40 leading-relaxed">
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                  Organizează linkurile în coloane logice: Servicii, Companie, Legal.
                </li>
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                  Folosește {"{year}"} în copyright pentru actualizare automată anuală.
                </li>
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                  Maxim 7 linkuri per coloană pentru un footer curat și navigabil.
                </li>
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                  URL-urile pot fi ancore (#servicii), rute (/servicii) sau linkuri externe.
                </li>
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                  Modificările se salvează prin butonul de jos sau Ctrl+Enter.
                </li>
              </ul>
            )}
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
      {label && (
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
      )}
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

/** Contor de caractere cu bară de progres */
function CharCount({
  current,
  max,
  id,
}: {
  current: number;
  max: number;
  id?: string;
}) {
  const ratio = current / max;
  const isOver = current > max;
  const isWarning = ratio > 0.85 && !isOver;

  return (
    <div className="flex items-center justify-end gap-2 mt-1.5" id={id}>
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
            <span>Salvează SEO &amp; Footer</span>
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

export type {
  SeoFormData,
  FooterFormData,
  FooterLinkData,
  FooterColumnData,
  FormErrors,
  PreviewMode,
  DeviceMode,
  ChangeLogEntry,
};
export { MAX_TITLE_LENGTH, MAX_DESC_LENGTH, MAX_KEYWORDS_COUNT, VALID_LANGUAGES };