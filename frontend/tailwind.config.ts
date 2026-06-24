import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ──────────────────────────────────────────
      // Culori personalizate: mov / aurii
      // ──────────────────────────────────────────
      colors: {
        nexus: {
          dark:   "#0D0A1A",
          medium: "#1A1530",
          accent: "#6C3CE1",
          glow:   "#9B6DFF",
        },
        gold: {
          DEFAULT: "#D4AF37",
          light:   "#F0D060",
          dark:    "#A68A20",
          pale:    "#F5E6A3",
        },
        glass: {
          light:     "rgba(255,255,255,0.06)",
          medium:    "rgba(255,255,255,0.10)",
          heavy:     "rgba(255,255,255,0.15)",
          border:    "rgba(255,255,255,0.12)",
          highlight: "rgba(255,255,255,0.25)",
          shadow:    "rgba(0,0,0,0.35)",
        },
      },

      // ──────────────────────────────────────────
      // Fonturi
      // ──────────────────────────────────────────
      fontFamily: {
        sans: [
          "Inter", "system-ui", "-apple-system", "BlinkMacSystemFont",
          "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif",
        ],
        heading: [
          "Poppins", "Inter", "system-ui", "-apple-system",
          "BlinkMacSystemFont", "Segoe UI", "sans-serif",
        ],
        mono: [
          "JetBrains Mono", "Fira Code", "Cascadia Code",
          "Consolas", "Monaco", "monospace",
        ],
      },

      // ──────────────────────────────────────────
      // Breakpoint-uri personalizate
      // ──────────────────────────────────────────
      screens: {
        xs:    "480px",
        sm:    "640px",
        md:    "768px",
        lg:    "1024px",
        xl:    "1280px",
        "2xl": "1440px",
        "3xl": "1600px",
        glass: "769px",
      },

      // ──────────────────────────────────────────
      // Animații și keyframes
      // ──────────────────────────────────────────
      animation: {
        "float":         "float 6s ease-in-out infinite",
        "float-delay":   "float 8s ease-in-out 2s infinite",
        "glow-pulse":    "glowPulse 3s ease-in-out infinite",
        "shimmer":       "shimmer 2s linear infinite",
        "fade-in-up":    "fadeInUp 0.6s ease-out forwards",
        "spin-slow":     "spin 8s linear infinite",
        "bounce-gentle": "bounceGentle 2s ease-in-out infinite",
        "gradient-flow": "gradientFlow 4s ease-in-out infinite alternate",
        "tilt":          "tilt 0.4s ease-out forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px) translateX(0px)" },
          "25%":      { transform: "translateY(-12px) translateX(6px)" },
          "50%":      { transform: "translateY(-6px) translateX(-6px)" },
          "75%":      { transform: "translateY(-18px) translateX(4px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(108,60,225,0.4), 0 0 30px rgba(108,60,225,0.2)" },
          "50%":      { boxShadow: "0 0 30px rgba(155,109,255,0.6), 0 0 60px rgba(108,60,225,0.35)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeInUp: {
          "0%":   { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        bounceGentle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        gradientFlow: {
          "0%":   { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
        tilt: {
          "0%":   { transform: "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)" },
          "100%": { transform: "perspective(800px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) scale(1.02)" },
        },
      },

      // ──────────────────────────────────────────
      // Background-uri personalizate
      // ──────────────────────────────────────────
      backgroundImage: {
        "nexus-gradient":   "linear-gradient(135deg, #6C3CE1 0%, #9B6DFF 30%, #D4AF37 70%, #F0D060 100%)",
        "dark-radial":      "radial-gradient(ellipse at center, #1A1530 0%, #0D0A1A 70%)",
        "gold-subtle":      "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(240,208,96,0.14) 100%)",
        "nexus-horizontal": "linear-gradient(90deg, #6C3CE1 0%, #D4AF37 100%)",
        "shimmer-bg":       "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.2) 50%, transparent 100%)",
      },

      // ──────────────────────────────────────────
      // Umbre personalizate (glassmorphism)
      // ──────────────────────────────────────────
      boxShadow: {
        "glass-sm":   "0 2px 8px rgba(0,0,0,0.25), 0 0 2px rgba(255,255,255,0.05)",
        "glass":      "0 4px 16px rgba(0,0,0,0.3), 0 0 4px rgba(255,255,255,0.08)",
        "glass-lg":   "0 8px 32px rgba(0,0,0,0.4), 0 0 8px rgba(255,255,255,0.10)",
        "nexus-glow": "0 0 20px rgba(108,60,225,0.35), 0 0 40px rgba(108,60,225,0.15)",
        "gold-glow":  "0 0 20px rgba(212,175,55,0.3), 0 0 40px rgba(212,175,55,0.12)",
        "nexus-card": "0 4px 24px rgba(0,0,0,0.35), 0 0 6px rgba(108,60,225,0.2)",
        "inner-glow": "inset 0 0 12px rgba(108,60,225,0.15)",
      },

      // ──────────────────────────────────────────
      // Border radius
      // ──────────────────────────────────────────
      borderRadius: {
        glass:      "16px",
        "glass-lg": "24px",
        "glass-full": "9999px",
      },

      // ──────────────────────────────────────────
      // Backdrop blur
      // ──────────────────────────────────────────
      backdropBlur: {
        xs:  "2px",
        sm:  "4px",
        md:  "8px",
        lg:  "12px",
        xl:  "20px",
        "2xl": "40px",
      },

      // ──────────────────────────────────────────
      // Z-index scale extinsă
      // ──────────────────────────────────────────
      zIndex: {
        "0":  "0",
        "10": "10",
        "20": "20",
        "30": "30",
        "40": "40",
        "50": "50",
        particles: "5",
        cursor:    "9999",
        glass:     "10",
        dropdown:  "100",
        modal:     "200",
        toast:     "300",
      },

      // ──────────────────────────────────────────
      // Spațiere extinsă
      // ──────────────────────────────────────────
      spacing: {
        section:    "6rem",
        "section-sm": "4rem",
        "section-lg": "8rem",
        "glass-pad":  "2rem",
      },

      // ──────────────────────────────────────────
      // Opacitate extinsă
      // ──────────────────────────────────────────
      opacity: {
        glass:        "0.08",
        "glass-hover": "0.14",
      },
    },
  },

  // ────────────────────────────────────────────
  // Plugin-uri Tailwind
  // ────────────────────────────────────────────
  plugins: [
    function ({ addUtilities, theme }: { addUtilities: Function; theme: Function }) {
      const newUtilities: Record<string, Record<string, string>> = {
        ".glass": {
          background: "rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: theme("borderRadius.glass") || "16px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3), 0 0 4px rgba(255, 255, 255, 0.08)",
        },
        ".glass-heavy": {
          background: "rgba(255, 255, 255, 0.10)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: theme("borderRadius.glass") || "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 8px rgba(255, 255, 255, 0.10)",
        },
        ".glass-light": {
          background: "rgba(255, 255, 255, 0.04)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: theme("borderRadius.glass") || "16px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
        },
        ".glass-panel": {
          background: "rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.10)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
        },
        ".glass-input": {
          background: "rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "8px",
          color: "#ffffff",
          padding: "0.75rem 1rem",
          outline: "none",
          transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        },
        ".glass-input:focus": {
          borderColor: "rgba(155, 109, 255, 0.5)",
          boxShadow: "0 0 0 3px rgba(108, 60, 225, 0.2)",
        },
        ".glass-input::placeholder": {
          color: "rgba(255, 255, 255, 0.35)",
        },
        ".glass-btn": {
          background: "rgba(108, 60, 225, 0.25)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(155, 109, 255, 0.3)",
          borderRadius: "8px",
          color: "#ffffff",
          fontWeight: "600",
          padding: "0.75rem 1.5rem",
          cursor: "pointer",
          transition: "all 0.3s ease",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        },
        ".glass-btn:hover": {
          background: "rgba(108, 60, 225, 0.40)",
          borderColor: "rgba(155, 109, 255, 0.5)",
          boxShadow: "0 0 20px rgba(108, 60, 225, 0.35)",
          transform: "translateY(-1px)",
        },
        ".glass-btn:active": {
          transform: "translateY(0px)",
          boxShadow: "0 0 10px rgba(108, 60, 225, 0.25)",
        },
        ".glass-btn-gold": {
          background: "rgba(212, 175, 55, 0.20)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(212, 175, 55, 0.35)",
          borderRadius: "8px",
          color: "#F0D060",
          fontWeight: "600",
          padding: "0.75rem 1.5rem",
          cursor: "pointer",
          transition: "all 0.3s ease",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        },
        ".glass-btn-gold:hover": {
          background: "rgba(212, 175, 55, 0.30)",
          borderColor: "rgba(240, 208, 96, 0.55)",
          boxShadow: "0 0 20px rgba(212, 175, 55, 0.35)",
          transform: "translateY(-1px)",
        },
        ".glass-divider": {
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
          border: "none",
          margin: "0",
        },
        ".glass-highlight": {
          position: "relative",
          overflow: "hidden",
        },
        ".glass-highlight::after": {
          content: '""',
          position: "absolute",
          top: "0",
          left: "0",
          right: "0",
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
          pointerEvents: "none",
        },
        ".text-nexus-gradient": {
          background: "linear-gradient(135deg, #9B6DFF 0%, #D4AF37 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        },
        ".shimmer": {
          background: "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.15) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2s linear infinite",
        },
        ".glass-disabled": {
          opacity: "0.4",
          pointerEvents: "none",
          cursor: "not-allowed",
        },
      };

      addUtilities(newUtilities, ["responsive", "hover", "focus", "active"]);
    },
  ],
};

export default config;