"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faPhone,
  faLocationDot,
  faArrowUp,
  faHeart,
  faGlobe,
} from "@fortawesome/free-solid-svg-icons";
import {
  faGithub,
  faLinkedin,
  faXTwitter,
  faInstagram,
} from "@fortawesome/free-brands-svg-icons";
import { fetchSettings } from "../lib/api";
import type { NexusSettings } from "../lib/fallback";
import { fallbackSettings } from "../lib/fallback";

/* ─────────────────────────────────────────────
   Tipuri
   ───────────────────────────────────────────── */

export interface FooterProps {
  /** Setări preîncărcate (opțional) */
  settings?: NexusSettings;
  /** Clasă CSS suplimentară */
  className?: string;
  /** ID DOM */
  id?: string;
}

/* ─────────────────────────────────────────────
   Constante
   ───────────────────────────────────────────── */

/** Icon map pentru social media (Font Awesome brands) */
const SOCIAL_ICON_MAP: Record<string, typeof faGithub> = {
  github: faGithub,
  linkedin: faLinkedin,
  twitter: faXTwitter,
  instagram: faInstagram,
};

/* ─────────────────────────────────────────────
   Componenta Footer
   ───────────────────────────────────────────── */

export default function Footer({
  settings: initialSettings,
  className = "",
  id,
}: FooterProps) {
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
          console.warn("[Footer] Fetch eșuat — se folosește fallback.");
          setSettings(fallbackSettings);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialSettings]);

  /* ── An curent dinamic ── */
  const currentYear = new Date().getFullYear();

  /* ── Parsare copyright dinamic ── */
  const copyrightText = settings?.footer?.copyright
    ? settings.footer.copyright.replace(/\{year\}/g, String(currentYear))
    : `${currentYear} Nexus Dev Studio. Toate drepturile rezervate.`;

  /* ── Loading state ── */
  if (!settings) {
    return (
      <footer
        id={id}
        className={`relative py-12 sm:py-16 bg-nexus-dark overflow-hidden ${className}`}
      >
        <div className="nexus-container">
          {/* Skeleton grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-5 w-24 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="glass-divider my-8" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="h-4 w-48 bg-white/5 rounded animate-pulse" />
            <div className="flex gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </footer>
    );
  }

  const { studio, footer } = settings;

  /* ── Social links din studio.social ── */
  const socialEntries = studio?.social
    ? (Object.entries(studio.social) as [string, string][])
    : [];

  return (
    <footer
      id={id}
      className={`relative pt-16 sm:pt-20 pb-8 sm:pb-10 bg-nexus-dark overflow-hidden ${className}`}
    >
      {/* ═════════════════════════════════════════
          FUNDAL DECORATIV
          ═════════════════════════════════════════ */}

      {/* Gradient radial jos */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(108,60,225,0.08)_0%,transparent_70%)] pointer-events-none z-0"
      />

      {/* Particule decorative */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute top-10 left-[8%] w-1 h-1 bg-gold/15 rounded-full animate-float" />
        <div className="absolute top-24 right-[10%] w-1.5 h-1.5 bg-nexus-glow/12 rounded-full animate-float-delay" />
        <div className="absolute bottom-32 left-[15%] w-1 h-1 bg-gold/10 rounded-full animate-float-delay" />
        <div className="absolute bottom-16 right-[20%] w-1.5 h-1.5 bg-nexus-accent/10 rounded-full animate-float" />
      </div>

      {/* Linie gradient superioară */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 z-[2] h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(108,60,225,0.35) 20%, rgba(212,175,55,0.3) 50%, rgba(108,60,225,0.35) 80%, transparent 100%)",
        }}
      />

      {/* ═════════════════════════════════════════
          CONȚINUT
          ═════════════════════════════════════════ */}
      <div className="relative z-10 nexus-container">
        {/* ── Grid principal ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 mb-12 sm:mb-16"
        >
          {/* ═══ Coloana 1: Brand + descriere ═══ */}
          <div className="lg:col-span-1">
            {/* Logo / Nume */}
            <a
              href="#hero"
              className="inline-flex items-center gap-2.5 mb-4 group"
              aria-label="Mergi la începutul paginii"
            >
              <span className="w-9 h-9 rounded-lg bg-nexus-accent/20 border border-nexus-accent/30 flex items-center justify-center transition-all duration-300 group-hover:bg-nexus-accent/30 group-hover:border-nexus-glow/40 group-hover:shadow-[0_0_18px_rgba(108,60,225,0.3)]">
                <FontAwesomeIcon
                  icon={faGlobe}
                  className="w-4 h-4 text-nexus-glow"
                />
              </span>
              <span className="font-heading text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {studio?.name || "Nexus Dev Studio"}
              </span>
            </a>

            <p className="text-sm text-white/45 leading-relaxed mb-5 max-w-xs">
              {studio?.description ||
                "Transformăm idei în realitate digitală. Partenerul tău tehnic complet."}
            </p>

            {/* Info contact compact */}
            <ul className="space-y-3">
              {studio?.email && (
                <li>
                  <a
                    href={`mailto:${studio.email}`}
                    className="flex items-center gap-2.5 text-sm text-white/55 hover:text-gold-light transition-colors group"
                  >
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="w-3.5 h-3.5 text-white/30 group-hover:text-gold-light/70 transition-colors"
                    />
                    <span className="truncate">{studio.email}</span>
                  </a>
                </li>
              )}
              {studio?.phone && (
                <li>
                  <a
                    href={`tel:${studio.phone.replace(/\s/g, "")}`}
                    className="flex items-center gap-2.5 text-sm text-white/55 hover:text-gold-light transition-colors group"
                  >
                    <FontAwesomeIcon
                      icon={faPhone}
                      className="w-3.5 h-3.5 text-white/30 group-hover:text-gold-light/70 transition-colors"
                    />
                    <span>{studio.phone}</span>
                  </a>
                </li>
              )}
              {studio?.address && (
                <li>
                  <span className="flex items-center gap-2.5 text-sm text-white/45">
                    <FontAwesomeIcon
                      icon={faLocationDot}
                      className="w-3.5 h-3.5 text-white/25"
                    />
                    <span>{studio.address}</span>
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* ═══ Coloane 2-4: Link-uri din footer.columns ═══ */}
          {footer?.columns?.map((column, colIdx) => (
            <div key={colIdx}>
              <h4 className="font-heading text-sm font-semibold text-white/80 mb-4 uppercase tracking-wider">
                {column.title}
              </h4>
              <ul className="space-y-2.5">
                {column.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <a
                      href={link.href}
                      className="text-sm text-white/45 hover:text-nexus-glow transition-colors duration-300 flex items-center gap-1.5 group"
                    >
                      <span className="w-0 h-px bg-nexus-glow/60 transition-all duration-300 group-hover:w-3" />
                      <span>{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Fallback: dacă nu există columns, arătăm coloane hardcodate */}
          {(!footer?.columns || footer.columns.length === 0) && (
            <>
              {/* Coloana Servicii fallback */}
              <div>
                <h4 className="font-heading text-sm font-semibold text-white/80 mb-4 uppercase tracking-wider">
                  Servicii
                </h4>
                <ul className="space-y-2.5">
                  {[
                    { label: "Dezvoltare Web", href: "#services" },
                    { label: "Aplicații Mobile", href: "#services" },
                    { label: "E-Commerce", href: "#services" },
                    { label: "Design UI/UX", href: "#services" },
                  ].map((link, i) => (
                    <li key={i}>
                      <a
                        href={link.href}
                        className="text-sm text-white/45 hover:text-nexus-glow transition-colors duration-300 flex items-center gap-1.5 group"
                      >
                        <span className="w-0 h-px bg-nexus-glow/60 transition-all duration-300 group-hover:w-3" />
                        <span>{link.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Coloana Companie fallback */}
              <div>
                <h4 className="font-heading text-sm font-semibold text-white/80 mb-4 uppercase tracking-wider">
                  Companie
                </h4>
                <ul className="space-y-2.5">
                  {[
                    { label: "Despre noi", href: "#hero" },
                    { label: "Portofoliu", href: "#portfolio" },
                    { label: "Proces", href: "#process" },
                    { label: "FAQ", href: "#faq" },
                    { label: "Contact", href: "#contact" },
                  ].map((link, i) => (
                    <li key={i}>
                      <a
                        href={link.href}
                        className="text-sm text-white/45 hover:text-nexus-glow transition-colors duration-300 flex items-center gap-1.5 group"
                      >
                        <span className="w-0 h-px bg-nexus-glow/60 transition-all duration-300 group-hover:w-3" />
                        <span>{link.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </motion.div>

        {/* ═════════════════════════════════════════
            SEPARATOR
            ═════════════════════════════════════════ */}
        <hr className="glass-divider mb-8 sm:mb-10" />

        {/* ═════════════════════════════════════════
            RÂND INFERIOR: Copyright + Social + Back to top
            ═════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          {/* ── Copyright dinamic ── */}
          <p className="text-xs sm:text-sm text-white/30 text-center sm:text-left flex items-center gap-1 flex-wrap justify-center sm:justify-start">
            <span>{copyrightText}</span>
            <span className="inline-flex items-center gap-1 text-white/20">
              <span>|</span>
              <FontAwesomeIcon icon={faHeart} className="w-3 h-3 text-red-400/60" />
              <span>
                Construit cu pasiune în {studio?.address?.split(",")[0] || "București"}
              </span>
            </span>
          </p>

          {/* ── Social icons ── */}
          <div className="flex items-center gap-3">
            {socialEntries.map(([platform, url]) => {
              const icon = SOCIAL_ICON_MAP[platform];
              if (!icon) return null;

              const label =
                platform.charAt(0).toUpperCase() + platform.slice(1);

              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Vizitează ${label}`}
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/8 flex items-center justify-center text-white/40 hover:text-gold-light hover:bg-gold/10 hover:border-gold/25 transition-all duration-300 hover:scale-110 active:scale-95"
                >
                  <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5" />
                </a>
              );
            })}

            {/* Fallback social dacă nu există */}
            {socialEntries.length === 0 && (
              <>
                {[
                  { platform: "github", icon: faGithub, url: "#" },
                  { platform: "linkedin", icon: faLinkedin, url: "#" },
                  { platform: "twitter", icon: faXTwitter, url: "#" },
                  { platform: "instagram", icon: faInstagram, url: "#" },
                ].map(({ platform, icon, url }) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Vizitează ${platform}`}
                    className="w-9 h-9 rounded-full bg-white/5 border border-white/8 flex items-center justify-center text-white/40 hover:text-gold-light hover:bg-gold/10 hover:border-gold/25 transition-all duration-300 hover:scale-110 active:scale-95"
                  >
                    <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5" />
                  </a>
                ))}
              </>
            )}
          </div>

          {/* ── Buton Back to Top ── */}
          <a
            href="#hero"
            aria-label="Mergi la începutul paginii"
            className="w-9 h-9 rounded-full bg-nexus-accent/15 border border-nexus-accent/25 flex items-center justify-center text-nexus-glow hover:bg-nexus-accent/25 hover:border-nexus-glow/40 hover:shadow-[0_0_15px_rgba(108,60,225,0.3)] transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <FontAwesomeIcon icon={faArrowUp} className="w-3.5 h-3.5" />
          </a>
        </motion.div>

        {/* ═════════════════════════════════════════
            LINIE FINALĂ SUBTILĂ
            ═════════════════════════════════════════ */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 text-center text-[10px] sm:text-xs text-white/15 font-mono"
        >
          {studio?.name || "Nexus Dev Studio"} &middot;{" "}
          {studio?.tagline || "Transformăm idei în realitate digitală."}
        </motion.p>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   Exporturi denumite
   ───────────────────────────────────────────── */

export { SOCIAL_ICON_MAP };