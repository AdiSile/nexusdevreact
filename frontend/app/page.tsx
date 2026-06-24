"use client";

import Hero from "../components/Hero";
import CustomCursor from "../components/CustomCursor";

/* ─────────────────────────────────────────────────────────
   Pagina principală Nexus Dev Studio
   ───────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-nexus-dark text-white overflow-x-hidden">
      {/* Cursor personalizat (ascuns pe mobil) */}
      <CustomCursor />

      {/* Secțiunea Hero cu video, particule, animații */}
      <Hero id="hero" />

      {/* 
        ═══════════════════════════════════════
        Secțiunile următoare vor fi adăugate
        în task-uri separate:
          - Servicii (#services)
          - Portofoliu (#portfolio)  
          - Proces (#process)
          - FAQ (#faq)
          - Contact (#contact)
          - Footer
        ═══════════════════════════════════════
      */}

      {/* Placeholder pentru secțiuni viitoare */}
      <div className="space-y-section" aria-hidden="true">
        <div id="services" className="h-4 scroll-mt-20" />
        <div id="portfolio" className="h-4 scroll-mt-20" />
        <div id="process" className="h-4 scroll-mt-20" />
        <div id="faq" className="h-4 scroll-mt-20" />
        <div id="contact" className="h-4 scroll-mt-20" />
      </div>
    </main>
  );
}