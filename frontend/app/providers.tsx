"use client";

/* ─────────────────────────────────────────────────────────
   Providers – Client wrapper pentru context providers globali
   (Theme, Analytics, Toast notifications, etc.)
   ───────────────────────────────────────────────────────── */

export default function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}