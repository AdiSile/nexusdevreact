"use client";

import { forwardRef, type ReactNode, type MouseEvent, type KeyboardEvent, type CSSProperties } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

/* ─────────────────────────────────────────────
   Tipuri
   ───────────────────────────────────────────── */

/** Variante de greutate glassmorphism */
export type GlassVariant = "light" | "default" | "heavy";

/** Moduri de glow pe border */
export type BorderGlowMode = "none" | "nexus" | "gold" | "mixed";

/** Comportament hover */
export type HoverEffect = "none" | "lift" | "glow" | "both";

/** Dimensiuni de padding predefinite */
export type GlassPadding = "none" | "sm" | "md" | "lg" | "xl";

export interface GlassCardProps {
  /** Conținutul cardului */
  children: ReactNode;

  /** Varianta de greutate glass: light | default | heavy */
  variant?: GlassVariant;

  /** Efect la hover: none | lift | glow | both */
  hoverEffect?: HoverEffect;

  /** Mod glow pe border: none | nexus | gold | mixed */
  borderGlow?: BorderGlowMode;

  /** Padding intern predefinit (none | sm | md | lg | xl) */
  padding?: GlassPadding;

  /** Animă intrarea cardului (fade-in-up) */
  animateIn?: boolean;

  /** Delay pentru animația de intrare (secunde) */
  animationDelay?: number;

  /** Evidențiază muchia superioară (efect de sticlă) */
  highlight?: boolean;

  /** Clase Tailwind/CSS suplimentare */
  className?: string;

  /** Stiluri inline suplimentare */
  style?: CSSProperties;

  /** ID DOM */
  id?: string;

  /** Cardul este interactiv? (adaugă cursor pointer + focus styles) */
  interactive?: boolean;

  /** Rol ARIA – default "button" dacă e interactiv */
  role?: string;

  /** Etichetă accesibilă */
  ariaLabel?: string;

  /** Descriere accesibilă */
  ariaDescribedBy?: string;

  /** Dezactivează cardul (opacitate redusă, pointer-events none) */
  disabled?: boolean;

  /** Handler click */
  onClick?: (e: MouseEvent<HTMLElement>) => void;

  /** Handler keydown (accesibilitate tastatură) */
  onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;

  /** Tab index personalizat */
  tabIndex?: number;
}

/* ─────────────────────────────────────────────
   Mapări stiluri
   ───────────────────────────────────────────── */

const VARIANT_CLASSES: Record<GlassVariant, string> = {
  light: "glass-light",
  default: "glass",
  heavy: "glass-heavy",
};

const PADDING_CLASSES: Record<GlassPadding, string> = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
  xl: "p-8 sm:p-10 lg:p-12",
};

/** Clasele de border-glow nu suprascriu border-ul de bază din `.glass` etc.,
 *  ci doar adaugă umbre colorate și ajustează culoarea border-ului. */
const BORDER_GLOW_CLASSES: Record<BorderGlowMode, string> = {
  none: "",

  nexus: [
    "border-nexus-accent/30",
    "shadow-[0_0_14px_rgba(108,60,225,0.14)]",
    "hover:border-nexus-glow/50",
    "hover:shadow-[0_0_28px_rgba(108,60,225,0.28),0_0_56px_rgba(108,60,225,0.12)]",
  ].join(" "),

  gold: [
    "border-gold/30",
    "shadow-[0_0_14px_rgba(212,175,55,0.10)]",
    "hover:border-gold-light/50",
    "hover:shadow-[0_0_28px_rgba(212,175,55,0.24),0_0_56px_rgba(212,175,55,0.08)]",
  ].join(" "),

  // mixed: folosește un pseudo-element pentru border gradient (border-image
  // nu se combină bine cu border-radius). Adăugăm umbre duale mov+auriu.
  mixed: [
    "border-white/5",
    "shadow-[0_0_14px_rgba(108,60,225,0.10),0_0_18px_rgba(212,175,55,0.06)]",
    "hover:shadow-[0_0_28px_rgba(108,60,225,0.22),0_0_36px_rgba(212,175,55,0.16)]",
  ].join(" "),
};

const HOVER_LIFT_CLASSES = "glass-hover-lift";

/* ─────────────────────────────────────────────
   Componentă
   ───────────────────────────────────────────── */

function GlassCardInner(
  props: GlassCardProps,
  ref: React.ForwardedRef<HTMLElement>,
) {
  const {
    children,
    variant = "default",
    hoverEffect = "none",
    borderGlow = "none",
    padding = "md",
    animateIn = false,
    animationDelay = 0,
    highlight = false,
    className = "",
    style,
    id,
    interactive = false,
    role,
    ariaLabel,
    ariaDescribedBy,
    disabled = false,
    onClick,
    onKeyDown,
    tabIndex,
  } = props;

  /* ── Clase compuse ── */
  const variantClass = VARIANT_CLASSES[variant];
  const paddingClass = PADDING_CLASSES[padding];
  const borderGlowClass = BORDER_GLOW_CLASSES[borderGlow];

  const hasLift = hoverEffect === "lift" || hoverEffect === "both";
  const hasHoverGlow = hoverEffect === "glow" || hoverEffect === "both";

  const composedClassName = [
    variantClass,
    paddingClass,
    borderGlowClass,
    hasLift && HOVER_LIFT_CLASSES,
    hasHoverGlow && "group",
    highlight && "glass-highlight",
    interactive && !disabled && "cursor-pointer",
    disabled && "glass-disabled opacity-40 pointer-events-none select-none",
    "transition-all duration-300 ease-out",
    "relative overflow-hidden",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  /* ── Atribute de accesibilitate ── */
  const resolvedRole =
    role ?? (interactive ? "button" : undefined);

  const ariaProps: Record<string, string | undefined> = {};
  if (ariaLabel) ariaProps["aria-label"] = ariaLabel;
  if (ariaDescribedBy) ariaProps["aria-describedby"] = ariaDescribedBy;

  /* ── Handler tastatură implicit pentru carduri interactive ── */
  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
      return;
    }

    // Comportament implicit: Enter / Space declanșează click
    if (interactive && !disabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      if (onClick) {
        onClick(e as unknown as MouseEvent<HTMLElement>);
      }
    }
  };

  /* ── Motion props (animație intrare) ── */
  const motionProps: HTMLMotionProps<"div"> =
    animateIn
      ? {
          initial: { opacity: 0, y: 30 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-60px" },
          transition: {
            duration: 0.55,
            delay: animationDelay,
            ease: [0.23, 1, 0.32, 1],
          },
        }
      : {};

  /* ── Render ── */
  return (
    <motion.div
      ref={ref as React.ForwardedRef<HTMLDivElement>}
      id={id}
      className={composedClassName}
      style={style}
      role={resolvedRole}
      tabIndex={interactive && !disabled ? (tabIndex ?? 0) : tabIndex}
      onClick={disabled ? undefined : onClick}
      onKeyDown={disabled ? undefined : handleKeyDown}
      {...ariaProps}
      {...motionProps}
    >
      {/* ═══ Border gradient pentru modul mixed ═══ */}
      {borderGlow === "mixed" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
          style={{
            padding: "1px",
            background:
              "linear-gradient(135deg, rgba(108,60,225,0.40), rgba(212,175,55,0.35))",
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />
      )}

      {/* ═══ Overlay glow la hover ═══ */}
      {hasHoverGlow && (
        <div
          aria-hidden="true"
          className={[
            "pointer-events-none absolute inset-0 z-0 rounded-[inherit]",
            "opacity-0 transition-opacity duration-500 ease-out",
            // Pseudo group-hover: cardul primește clasa group și overlay-ul reacționează
            "group-hover:opacity-100",
          ].join(" ")}
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(108,60,225,0.14) 0%, transparent 65%)",
          }}
        />
      )}

      {/* ═══ Conținut ═══ */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Export cu forwardRef
   ───────────────────────────────────────────── */

const GlassCard = forwardRef<HTMLElement, GlassCardProps>(GlassCardInner);

GlassCard.displayName = "GlassCard";

export default GlassCard;
