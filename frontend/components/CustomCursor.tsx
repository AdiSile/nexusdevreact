"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/* ─────────────────────────────────────────────
   Constante
   ───────────────────────────────────────────── */

/** Lățimea maximă considerată „mobil" (sub acest prag cursorul e ascuns) */
const MOBILE_MAX_WIDTH = 768;

/** Dimensiunile cursorului personalizat */
const CURSOR = {
  /** Inelul exterior (auriu / glow mov) */
  ring: {
    size: 40,
    borderWidth: 2.5,
  },
  /** Punctul central */
  dot: {
    size: 8,
  },
} as const;

/* ─────────────────────────────────────────────
   Hook: detectare touch / mobil
   ───────────────────────────────────────────── */

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    let rafId: number;

    function check() {
      const coarse =
        typeof window !== "undefined" &&
        window.matchMedia("(pointer: coarse)").matches;
      const narrow =
        typeof window !== "undefined" &&
        window.innerWidth < MOBILE_MAX_WIDTH;

      setIsMobile(coarse || narrow);
      rafId = requestAnimationFrame(check);
    }

    check();

    return () => cancelAnimationFrame(rafId);
  }, []);

  return isMobile;
}

/* ─────────────────────────────────────────────
   Componentă principală
   ───────────────────────────────────────────── */

export interface CustomCursorProps {
  /** Dezactivează complet cursorul (overrides mobile detection) */
  disabled?: boolean;
  /** Factor de atenuare a spring-ului (mai mic = mai lent, mai mare = mai rapid) */
  damping?: number;
  /** Rigiditatea spring-ului */
  stiffness?: number;
}

export default function CustomCursor({
  disabled = false,
  damping = 28,
  stiffness = 180,
}: CustomCursorProps) {
  const isMobile = useIsMobile();
  const visible = !disabled && !isMobile;

  // ── Poziția brută mouse (valori motion) ──
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // ── Poziția spring (urmărire lină) ──
  const springX = useSpring(mouseX, { damping, stiffness, mass: 0.35 });
  const springY = useSpring(mouseY, { damping, stiffness, mass: 0.35 });

  // ── Stare pentru interacțiuni (hover pe elemente interactive) ──
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const hoverRef = useRef(false);
  const clickRef = useRef(false);

  /* ---------- handler mouse move ---------- */

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  }, [mouseX, mouseY]);

  /* ---------- handler mouse down / up ---------- */

  const handleMouseDown = useCallback(() => {
    clickRef.current = true;
    setIsClicking(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    clickRef.current = false;
    setIsClicking(false);
  }, []);

  /* ---------- detectare hover pe elemente interactive ---------- */

  useEffect(() => {
    if (!visible) return;

    const interactiveSelectors = [
      "a",
      "button",
      "[role='button']",
      "[role='link']",
      "[role='menuitem']",
      "[role='tab']",
      "input",
      "textarea",
      "select",
      "summary",
      ".clickable",
      ".cursor-pointer",
      ".glass-btn",
      ".glass-btn-gold",
      ".nexus-link",
      "[data-cursor-hover]",
    ].join(", ");

    function handleMouseOver(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest(interactiveSelectors)) {
        hoverRef.current = true;
        setIsHovering(true);
      }
    }

    function handleMouseOut(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest(interactiveSelectors)) {
        hoverRef.current = false;
        setIsHovering(false);
      }
    }

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, [visible]);

  /* ---------- efect principal: event listeners mouse ---------- */

  useEffect(() => {
    if (!visible) return;

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [visible, handleMouseMove, handleMouseDown, handleMouseUp]);

  /* ---------- ascunde cursorul nativ ---------- */

  useEffect(() => {
    if (!visible) return;

    const style = document.createElement("style");
    style.id = "custom-cursor-hide-native";
    style.textContent = `
      html, body, *, a, button, [role="button"], input, textarea, select {
        cursor: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existing = document.getElementById("custom-cursor-hide-native");
      if (existing) existing.remove();
    };
  }, [visible]);

  /* ---------- render ---------- */

  if (!visible) return null;

  const ringSize = isHovering
    ? CURSOR.ring.size * 1.65
    : isClicking
      ? CURSOR.ring.size * 0.75
      : CURSOR.ring.size;

  const dotSize = isHovering
    ? CURSOR.dot.size * 0.5
    : isClicking
      ? CURSOR.dot.size * 1.5
      : CURSOR.dot.size;

  // Centrare: cursorul se poziționează cu vârful în punctul mouse-ului
  const offset = ringSize / 2;

  return (
    <>
      {/* ═══ Inel exterior – glow mov/auriu ═══ */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[--z-cursor]"
        style={{
          x: springX,
          y: springY,
          translateX: `-${offset}px`,
          translateY: `-${offset}px`,
          width: ringSize,
          height: ringSize,
        }}
        transition={{ duration: 0 }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{ width: ringSize, height: ringSize }}
        >
          {/* Inelul propriu-zis */}
          <div
            className="absolute inset-0 rounded-full transition-all duration-200 ease-out"
            style={{
              width: ringSize,
              height: ringSize,
              border: `${CURSOR.ring.borderWidth}px solid transparent`,
              background: isHovering
                ? "linear-gradient(135deg, rgba(212,175,55,0.55) 0%, rgba(108,60,225,0.45) 100%) border-box"
                : "linear-gradient(135deg, rgba(108,60,225,0.50) 0%, rgba(212,175,55,0.40) 100%) border-box",
              WebkitMask:
                "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              boxShadow: isHovering
                ? "0 0 18px rgba(212,175,55,0.50), 0 0 36px rgba(108,60,225,0.35), 0 0 60px rgba(155,109,255,0.18)"
                : "0 0 12px rgba(108,60,225,0.28), 0 0 28px rgba(155,109,255,0.12)",
              opacity: isClicking ? 0.8 : 1,
            }}
          />

          {/* Glow exterior suplimentar */}
          <div
            className="absolute inset-0 rounded-full blur-xl transition-all duration-300"
            style={{
              width: ringSize * 1.2,
              height: ringSize * 1.2,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: isHovering
                ? "radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(108,60,225,0.18) 0%, transparent 70%)",
              opacity: isClicking ? 0.5 : 1,
            }}
          />
        </div>
      </motion.div>

      {/* ═══ Punct central – mov ═══ */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[--z-cursor]"
        style={{
          x: springX,
          y: springY,
          translateX: `-${dotSize / 2}px`,
          translateY: `-${dotSize / 2}px`,
          width: dotSize,
          height: dotSize,
        }}
        transition={{ duration: 0 }}
      >
        <div
          className="rounded-full transition-all duration-150 ease-out"
          style={{
            width: dotSize,
            height: dotSize,
            background: isHovering
              ? "linear-gradient(135deg, #F0D060 0%, #D4AF37 100%)"
              : "linear-gradient(135deg, #9B6DFF 0%, #6C3CE1 100%)",
            boxShadow: isHovering
              ? "0 0 10px rgba(212,175,55,0.80), 0 0 24px rgba(212,175,55,0.35)"
              : "0 0 8px rgba(155,109,255,0.70), 0 0 20px rgba(108,60,225,0.35)",
          }}
        />
      </motion.div>
    </>
  );
}