"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Particles from "../components/Particles";

/* ═══════════════════════════════════════════════════════════════════════════
   Loading Page – Nexus Dev Studio
   Stare de încărcare animată cu particule și spinner glassmorphism
   ═══════════════════════════════════════════════════════════════════════════ */

const LOADING_MESSAGES = [
  "Se încarcă…",
  "Pregătim experiența…",
  "Inițializăm universul digital…",
  "Sincronizăm particulele…",
  "Aproape gata…",
  "Calibrăm strălucirea…",
];

const MESSAGE_INTERVAL_MS = 2200;

export default function LoadingPage() {
  const [messageIndex, setMessageIndex] = useState(0);

  /* ── Rotește mesajele de încărcare ── */
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, MESSAGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="relative min-h-screen bg-nexus-dark text-white overflow-hidden flex items-center justify-center">
      {/* ═══════════════════════════════════════════════
          FUNDAL – Canvas cu particule animate
          ═══════════════════════════════════════════════ */}
      <Particles
        particleCount={64}
        globalAlpha={0.7}
        className="z-[1]"
        id="loading-particles"
      />

      {/* Overlay radial gradient pentru adâncire */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 20%, rgba(13,10,26,0.55) 70%, rgba(13,10,26,0.85) 100%)",
        }}
      />

      {/* ═══════════════════════════════════════════════
          CARD CENTRAL – Glassmorphism
          ═══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: 0.65,
          ease: [0.23, 1, 0.32, 1],
        }}
        className="relative z-10 glass-heavy rounded-glass-lg p-10 sm:p-14 md:p-16 flex flex-col items-center gap-8 max-w-md w-full mx-4 glass-highlight"
      >
        {/* ═══════════════════════════════════════════════
            SPINNER – SVG dublu inel cu gradient + glow
            ═══════════════════════════════════════════════ */}

        <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36">
          {/* SVG cu definiții de gradient */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 144 144"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              {/* Gradient mov → auriu pentru inelul exterior */}
              <linearGradient
                id="spinner-gradient-outer"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2="144"
                y2="144"
              >
                <stop offset="0%" stopColor="#6C3CE1" stopOpacity="0.9" />
                <stop offset="30%" stopColor="#9B6DFF" stopOpacity="0.7" />
                <stop offset="60%" stopColor="#D4AF37" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#F0D060" stopOpacity="0.9" />
              </linearGradient>

              {/* Gradient invers pentru inelul interior */}
              <linearGradient
                id="spinner-gradient-inner"
                gradientUnits="userSpaceOnUse"
                x1="144"
                y1="0"
                x2="0"
                y2="144"
              >
                <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#9B6DFF" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#6C3CE1" stopOpacity="0.85" />
              </linearGradient>
            </defs>

            {/* Inel exterior – se rotește lent */}
            <motion.circle
              cx="72"
              cy="72"
              r="62"
              stroke="url(#spinner-gradient-outer)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="90 300"
              animate={{ rotate: [0, 360] }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{ transformOrigin: "72px 72px" }}
            />

            {/* Inel interior – se rotește invers, mai rapid */}
            <motion.circle
              cx="72"
              cy="72"
              r="48"
              stroke="url(#spinner-gradient-inner)"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="60 240"
              animate={{ rotate: [360, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{ transformOrigin: "72px 72px" }}
            />
          </svg>

          {/* Punct central – pulsează */}
          <motion.div
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.55, 1, 0.55],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 40% 40%, rgba(240,208,96,0.95) 0%, rgba(212,175,55,0.7) 35%, rgba(155,109,255,0.5) 70%, rgba(108,60,225,0.2) 100%)",
              boxShadow:
                "0 0 24px rgba(212,175,55,0.4), 0 0 48px rgba(155,109,255,0.25), 0 0 72px rgba(108,60,225,0.12)",
            }}
          />
        </div>

        {/* ═══════════════════════════════════════════════
            TEXT – Mesaj de încărcare animat
            ═══════════════════════════════════════════════ */}

        <div className="flex flex-col items-center gap-3">
          {/* Logo / text Nexus */}
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-heading text-xl sm:text-2xl font-bold tracking-tight"
          >
            <span className="text-white/90">Nexus</span>{" "}
            <span className="text-nexus-gradient">Dev Studio</span>
          </motion.span>

          {/* Mesaj rotativ cu AnimatePresence pentru exit animation */}
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-sm sm:text-base text-white/40 font-sans tracking-wide min-h-[1.5rem]"
            >
              {LOADING_MESSAGES[messageIndex]}
            </motion.p>
          </AnimatePresence>

          {/* Dots indicator – puncte de progres */}
          <div className="flex gap-1.5 mt-1" aria-hidden="true">
            {LOADING_MESSAGES.map((_, i) => (
              <motion.span
                key={i}
                animate={{
                  opacity: i === messageIndex ? 0.75 : 0.18,
                  scale: i === messageIndex ? 1.2 : 1,
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="block w-1.5 h-1.5 rounded-full"
                style={{
                  background:
                    i === messageIndex
                      ? "linear-gradient(135deg, #9B6DFF, #D4AF37)"
                      : "rgba(255, 255, 255, 0.25)",
                }}
              />
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            GLOW DECORATIV – Sub card (reflexie)
            ═══════════════════════════════════════════════ */}
        <motion.div
          animate={{
            opacity: [0.15, 0.35, 0.15],
            scale: [0.85, 1.15, 0.85],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          aria-hidden="true"
          className="absolute -bottom-14 left-1/2 -translate-x-1/2 w-72 h-16 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, rgba(108,60,225,0.35) 0%, rgba(212,175,55,0.15) 40%, transparent 70%)",
            filter: "blur(28px)",
          }}
        />
      </motion.div>

      {/* ═══════════════════════════════════════════════
          LINIE GRADIENT LA BAZĂ
          ═══════════════════════════════════════════════ */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 z-[2] h-24 sm:h-32 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(13,10,26,0.5) 50%, #0D0A1A 100%)",
        }}
      />
    </main>
  );
}