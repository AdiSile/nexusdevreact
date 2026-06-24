"use client";

import {
  forwardRef,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type MouseEvent,
  type KeyboardEvent,
  type CSSProperties,
} from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

/* ─────────────────────────────────────────────
   Tipuri
   ───────────────────────────────────────────── */

/** Variante de greutate glassmorphism */
export type TiltGlassVariant = "light" | "default" | "heavy" | "none";

/** Moduri de glow pe border */
export type TiltBorderGlow = "none" | "nexus" | "gold" | "mixed";

/** Dimensiuni de padding predefinite */
export type TiltPadding = "none" | "sm" | "md" | "lg" | "xl";

export interface TiltCardProps {
  /** Conținutul cardului */
  children: ReactNode;

  /** Intensitatea efectului de tilt (0 = dezactivat, 1 = normal, >1 = exagerat).
   *  Implicit 1. */
  tiltIntensity?: number;

  /** Valoarea perspectivei CSS (px). Implicit 800. */
  perspective?: number;

  /** Unghiul maxim de rotație (grade). Implicit 10. */
  maxTilt?: number;

  /** Factor de scalare la hover. Implicit 1.03.
   *  1 = fără scalare. */
  scale?: number;

  /** Viteza tranziției de revenire (secunde). Implicit 0.55. */
  transitionSpeed?: number;

  /** Activează efectul de glare / reflexie care urmărește mouse-ul */
  enableGlare?: boolean;

  /** Opacitatea maximă a glare-ului (0-1). Implicit 0.12. */
  glareMaxOpacity?: number;

  /** Culoarea glare-ului (rgba sau orice valoare CSS). Implicit rgba(255,255,255,0.18). */
  glareColor?: string;

  /** Varianta de greutate glass: light | default | heavy | none */
  glassVariant?: TiltGlassVariant;

  /** Mod glow pe border: none | nexus | gold | mixed */
  borderGlow?: TiltBorderGlow;

  /** Padding intern predefinit (none | sm | md | lg | xl) */
  padding?: TiltPadding;

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

  /** Rol ARIA */
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
   Mapări stiluri glass
   ───────────────────────────────────────────── */

const GLASS_VARIANT_CLASSES: Record<TiltGlassVariant, string> = {
  light: "glass-light",
  default: "glass",
  heavy: "glass-heavy",
  none: "",
};

const PADDING_CLASSES: Record<TiltPadding, string> = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
  xl: "p-8 sm:p-10 lg:p-12",
};

const BORDER_GLOW_CLASSES: Record<TiltBorderGlow, string> = {
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

  mixed: [
    "border-white/5",
    "shadow-[0_0_14px_rgba(108,60,225,0.10),0_0_18px_rgba(212,175,55,0.06)]",
    "hover:shadow-[0_0_28px_rgba(108,60,225,0.22),0_0_36px_rgba(212,175,55,0.16)]",
  ].join(" "),
};

/* ─────────────────────────────────────────────
   Componentă
   ───────────────────────────────────────────── */

function TiltCardInner(
  props: TiltCardProps,
  ref: React.ForwardedRef<HTMLElement>,
) {
  const {
    children,
    tiltIntensity = 1,
    perspective = 800,
    maxTilt = 10,
    scale = 1.03,
    transitionSpeed = 0.55,
    enableGlare = true,
    glareMaxOpacity = 0.12,
    glareColor = "rgba(255, 255, 255, 0.18)",
    glassVariant = "default",
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

  /* ── Ref locală pt calcul poziție mouse ── */
  const cardRef = useRef<HTMLDivElement | null>(null);

  /* ── Stare transformări ── */
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [currentScale, setCurrentScale] = useState(1);
  const [glareX, setGlareX] = useState(50);
  const [glareY, setGlareY] = useState(50);
  const [glareOpacity, setGlareOpacity] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  /* ── Calculează tilt pe baza poziției mouse-ului ── */
  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (disabled || tiltIntensity === 0) return;

      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();

      // Poziția mouse-ului relativ la centrul cardului, normalizată [-1, 1]
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const offsetX = ((e.clientX - centerX) / (rect.width / 2)) * tiltIntensity;
      const offsetY = ((e.clientY - centerY) / (rect.height / 2)) * tiltIntensity;

      // Limităm la [-1, 1] * tiltIntensity
      const clampedX = Math.max(-1, Math.min(1, offsetX));
      const clampedY = Math.max(-1, Math.min(1, offsetY));

      // Calculăm unghiurile (inversăm Y pentru ca tilt-ul să fie natural)
      const rotY = clampedX * maxTilt;
      const rotX = -clampedY * maxTilt;

      setRotateX(rotX);
      setRotateY(rotY);
      setCurrentScale(scale);

      // Poziția glare-ului (procentual)
      if (enableGlare) {
        const glarePosX = ((e.clientX - rect.left) / rect.width) * 100;
        const glarePosY = ((e.clientY - rect.top) / rect.height) * 100;
        setGlareX(glarePosX);
        setGlareY(glarePosY);
        setGlareOpacity(glareMaxOpacity);
      }
    },
    [disabled, tiltIntensity, maxTilt, scale, enableGlare, glareMaxOpacity],
  );

  /* ── Reset la intrarea mouse-ului ── */
  const handleMouseEnter = useCallback(() => {
    if (disabled || tiltIntensity === 0) return;
    setIsHovering(true);
    setCurrentScale(scale);

    if (enableGlare) {
      setGlareOpacity(glareMaxOpacity * 0.6);
    }
  }, [disabled, tiltIntensity, scale, enableGlare, glareMaxOpacity]);

  /* ── Revenire lină la starea inițială ── */
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setRotateX(0);
    setRotateY(0);
    setCurrentScale(1);
    setGlareOpacity(0);
    setGlareX(50);
    setGlareY(50);
  }, []);

  /* ── Stiluri compuse ── */
  const glassClass = GLASS_VARIANT_CLASSES[glassVariant];
  const paddingClass = PADDING_CLASSES[padding];
  const borderGlowClass = BORDER_GLOW_CLASSES[borderGlow];

  const composedClassName = [
    glassClass,
    paddingClass,
    borderGlowClass,
    highlight && "glass-highlight",
    interactive && !disabled && "cursor-pointer",
    disabled && "glass-disabled opacity-40 pointer-events-none select-none",
    "relative overflow-hidden",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  /* ── Transformare inline calculată ── */
  const tiltTransform: CSSProperties = {
    transform: [
      `perspective(${perspective}px)`,
      `rotateX(${rotateX}deg)`,
      `rotateY(${rotateY}deg)`,
      `scale3d(${currentScale}, ${currentScale}, ${currentScale})`,
    ].join(" "),
    transition: isHovering
      ? "transform 0.1s linear"
      : `transform ${transitionSpeed}s cubic-bezier(0.23, 1, 0.32, 1)`,
  };

  /* ── Atribute de accesibilitate ── */
  const resolvedRole = role ?? (interactive ? "button" : undefined);

  const ariaProps: Record<string, string | undefined> = {};
  if (ariaLabel) ariaProps["aria-label"] = ariaLabel;
  if (ariaDescribedBy) ariaProps["aria-describedby"] = ariaDescribedBy;

  /* ── Handler tastatură implicit pentru carduri interactive ── */
  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
      return;
    }

    if (interactive && !disabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      if (onClick) {
        onClick(e as unknown as MouseEvent<HTMLElement>);
      }
    }
  };

  /* ── Motion props (animație intrare) ── */
  const motionProps: HTMLMotionProps<"div"> = animateIn
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
      ref={(node) => {
        // Îmbinăm ref-ul local cu cel forwardat
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLElement | null>).current = node;
        }
      }}
      id={id}
      className={composedClassName}
      style={{
        ...tiltTransform,
        ...style,
        transformStyle: "preserve-3d",
        willChange: isHovering ? "transform" : "auto",
      }}
      role={resolvedRole}
      tabIndex={interactive && !disabled ? (tabIndex ?? 0) : tabIndex}
      onClick={disabled ? undefined : onClick}
      onKeyDown={disabled ? undefined : handleKeyDown}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
            transformStyle: "preserve-3d",
          }}
        />
      )}

      {/* ═══ Overlay glare / reflexie ═══ */}
      {enableGlare && tiltIntensity > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] rounded-[inherit]"
          style={{
            opacity: glareOpacity,
            transition: isHovering
              ? "opacity 0.15s linear"
              : `opacity ${transitionSpeed}s ease-out`,
            background: [
              `radial-gradient(
                ellipse at ${glareX}% ${glareY}%,
                ${glareColor} 0%,
                transparent 55%
              )`,
              // Al doilea strat: un gradient liniar subtil în direcția tilt-ului
              `linear-gradient(
                ${rotateY > 0 ? "105" : "75"}deg,
                rgba(255, 255, 255, 0.08) 0%,
                transparent 50%
              )`,
            ].join(", "),
          }}
        />
      )}

      {/* ═══ Conținut ═══ */}
      <div
        className="relative z-10"
        style={{
          transformStyle: "preserve-3d",
          // Contracarăm ușor transformarea pentru a păstra textul citibil
          transform: tiltIntensity > 0
            ? `translateZ(${Math.round(tiltIntensity * 20)}px)`
            : undefined,
          transition: isHovering
            ? "transform 0.1s linear"
            : `transform ${transitionSpeed}s ease-out`,
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Export cu forwardRef
   ───────────────────────────────────────────── */

const TiltCard = forwardRef<HTMLElement, TiltCardProps>(TiltCardInner);

TiltCard.displayName = "TiltCard";

export default TiltCard;