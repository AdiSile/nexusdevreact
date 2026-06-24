"use client";

import { useRef, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────────
   Tipuri interne
   ───────────────────────────────────────────── */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;          // opacitate curentă
  alphaTarget: number;    // țintă pentru pulsare
  alphaSpeed: number;     // viteză pulsare
}

interface Connection {
  a: number; // index particulă A
  b: number; // index particulă B
}

/* ─────────────────────────────────────────────
   Configurație implicită
   ───────────────────────────────────────────── */

const CONFIG = {
  /** Număr total de particule */
  particleCount: 72,

  /** Densitate: câte particule per 10_000 px² */
  densityPer10k: 4.2,

  /** Raza minimă / maximă */
  radiusMin: 1.2,
  radiusMax: 3.4,

  /** Viteza minimă / maximă (px per frame @60fps) */
  speedMin: 0.18,
  speedMax: 0.65,

  /** Distanța maximă între particule pentru a trasa o linie */
  connectionDistance: 135,

  /** Grosimea liniilor de conectare */
  lineWidth: 0.55,

  /** Opacitatea maximă a liniilor */
  lineAlphaMax: 0.25,

  /** Paleta de culori – mov / aurii */
  colors: [
    { hex: "108, 60, 225", weight: 3 },     // nexus.accent  #6C3CE1
    { hex: "155, 109, 255", weight: 2.5 },  // nexus.glow    #9B6DFF
    { hex: "212, 175, 55", weight: 2 },     // gold.DEFAULT  #D4AF37
    { hex: "240, 208, 96", weight: 1.5 },   // gold.light    #F0D060
    { hex: "166, 138, 32", weight: 1 },     // gold.dark     #A68A20
  ],
} as const;

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

/** Generează paleta ponderată – întoarce un array plat cu string-uri rgb */
function buildColorPool(): string[] {
  const pool: string[] = [];
  for (const c of CONFIG.colors) {
    for (let i = 0; i < Math.round(c.weight * 10); i++) {
      pool.push(c.hex);
    }
  }
  return pool;
}

function pickColor(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function randBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/* ─────────────────────────────────────────────
   Componentă
   ───────────────────────────────────────────── */

export interface ParticlesProps {
  /** Override număr particule (0 = auto, calculat după densitate) */
  particleCount?: number;
  /** Opacitate globală canvas (0-1), default 0.9 */
  globalAlpha?: number;
  /** Clasă CSS suplimentară pe wrapper */
  className?: string;
  /** ID pentru identificare în DOM */
  id?: string;
}

export default function Particles({
  particleCount = 0,
  globalAlpha = 0.9,
  className = "",
  id,
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const colorPoolRef = useRef<string[]>(buildColorPool());
  const dimensionsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  /* ---------- inițializare particule ---------- */

  const initParticles = useCallback(
    (width: number, height: number) => {
      const count =
        particleCount > 0
          ? particleCount
          : Math.round((width * height) / 10_000) * CONFIG.densityPer10k;

      const arr: Particle[] = [];
      const pool = colorPoolRef.current;

      for (let i = 0; i < count; i++) {
        arr.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 2 * randBetween(CONFIG.speedMin, CONFIG.speedMax),
          vy: (Math.random() - 0.5) * 2 * randBetween(CONFIG.speedMin, CONFIG.speedMax),
          radius: randBetween(CONFIG.radiusMin, CONFIG.radiusMax),
          color: pickColor(pool),
          alpha: randBetween(0.25, 0.85),
          alphaTarget: randBetween(0.25, 0.85),
          alphaSpeed: randBetween(0.003, 0.012),
        });
      }

      particlesRef.current = arr;
    },
    [particleCount],
  );

  /* ---------- resize handler ---------- */

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    dimensionsRef.current = { w: width, h: height };

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Reinițializăm doar dacă nu avem particule sau diferența e mare
    if (
      particlesRef.current.length === 0 ||
      Math.abs(particlesRef.current.length - CONFIG.particleCount) > 20
    ) {
      initParticles(width, height);
    }
  }, [initParticles]);

  /* ---------- animație ---------- */

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = dimensionsRef.current;
    if (w === 0 || h === 0) return;

    const particles = particlesRef.current;
    const connDist = CONFIG.connectionDistance;

    // Ștergem canvasul
    ctx.clearRect(0, 0, w, h);

    // --- actualizare poziții și desenare particule ---
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]!;

      // mișcare
      p.x += p.vx;
      p.y += p.vy;

      // wrap-around (toroidal)
      if (p.x < -p.radius) p.x = w + p.radius;
      if (p.x > w + p.radius) p.x = -p.radius;
      if (p.y < -p.radius) p.y = h + p.radius;
      if (p.y > h + p.radius) p.y = -p.radius;

      // pulsare opacitate
      if (p.alpha < p.alphaTarget) {
        p.alpha += p.alphaSpeed;
        if (p.alpha >= p.alphaTarget) {
          p.alphaTarget = randBetween(0.2, 0.85);
        }
      } else {
        p.alpha -= p.alphaSpeed;
        if (p.alpha <= p.alphaTarget) {
          p.alphaTarget = randBetween(0.2, 0.85);
        }
      }

      // desenare punct
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${(p.alpha * globalAlpha).toFixed(2)})`;
      ctx.fill();

      // glow subtil în jurul particulelor aurii
      if (p.color.startsWith("212") || p.color.startsWith("240") || p.color.startsWith("166")) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${(p.alpha * 0.08 * globalAlpha).toFixed(3)})`;
        ctx.fill();
      }
    }

    // --- desenare conexiuni ---
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i]!;
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j]!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < connDist) {
          const strength = 1 - dist / connDist; // 1 (aproape) → 0 (departe)
          const avgAlpha = ((a.alpha + b.alpha) / 2) * strength;
          const lineAlpha = avgAlpha * CONFIG.lineAlphaMax * globalAlpha;

          // culoare interpolată între cele două particule
          const aIsGold = a.color.startsWith("212") || a.color.startsWith("240") || a.color.startsWith("166");
          const bIsGold = b.color.startsWith("212") || b.color.startsWith("240") || b.color.startsWith("166");

          // Dacă ambele sunt aurii → auriu, mov + auriu → gradient, ambele mov → mov
          let r: number, g: number, bCol: number;
          if (aIsGold && bIsGold) {
            r = 212; g = 175; bCol = 55; // gold
          } else if (!aIsGold && !bIsGold) {
            r = 108; g = 60; bCol = 225; // mov
          } else {
            // mix: jumătate mov, jumătate auriu
            r = 160; g = 118; bCol = 140;
          }

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${bCol}, ${lineAlpha.toFixed(3)})`;
          ctx.lineWidth = CONFIG.lineWidth * strength;
          ctx.stroke();
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }, [globalAlpha]);

  /* ---------- efect principal ---------- */

  useEffect(() => {
    handleResize();

    // Pornim animația după un micro-tick (necesar pentru ca dimensiunile să fie setate)
    const startTimer = setTimeout(() => {
      if (particlesRef.current.length === 0) {
        initParticles(
          dimensionsRef.current.w || window.innerWidth,
          dimensionsRef.current.h || window.innerHeight,
        );
      }
      animFrameRef.current = requestAnimationFrame(animate);
    }, 40);

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(startTimer);
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [animate, handleResize, initParticles]);

  /* ---------- render ---------- */

  return (
    <canvas
      ref={canvasRef}
      id={id}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 ${className}`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
}