"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* ─────────────────────────────────────────────────────────
   Admin Layout – Nexus Dev Studio
   Design identic cu site-ul public (dark, glassmorphism)
   Fără navbar-ul public – sidebar + top bar dedicate
   ───────────────────────────────────────────────────────── */

/* ═══════════════════════════════════════════════
   Date navigare admin
   ═══════════════════════════════════════════════ */

interface AdminNavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "fa-chart-pie" },
  { label: "Servicii", href: "/admin/services", icon: "fa-cubes", badge: "21" },
  { label: "Portofoliu", href: "/admin/portfolio", icon: "fa-briefcase", badge: "6" },
  { label: "Proces", href: "/admin/process", icon: "fa-diagram-project", badge: "5" },
  { label: "FAQ", href: "/admin/faq", icon: "fa-circle-question", badge: "6" },
  { label: "Contact", href: "/admin/contact", icon: "fa-envelope" },
  { label: "Setări", href: "/admin/settings", icon: "fa-gear" },
];

/* ═══════════════════════════════════════════════
   Componenta Layout Admin
   ═══════════════════════════════════════════════ */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const toggleMobileMenu = useCallback(
    () => setMobileMenuOpen((prev) => !prev),
    [],
  );
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  /* ── Determină titlul paginii curente ── */
  const currentPage =
    ADMIN_NAV_ITEMS.find((item) => item.href === pathname)?.label ??
    "Admin";

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-nexus-dark text-white font-sans antialiased flex">
      {/* ═════════════════════════════════════════
          OVERLAY MOBIL (backdrop)
          ═════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeMobileMenu}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════
          SIDEBAR – desktop permanent / mobil overlay
          ═════════════════════════════════════════ */}

      {/* ── Desktop sidebar ── */}
      <aside
        className={`
          hidden lg:flex flex-col fixed inset-y-0 left-0 z-30
          transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${sidebarOpen ? "w-64" : "w-[72px]"}
        `}
      >
        <SidebarContent
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
          navItems={ADMIN_NAV_ITEMS}
          pathname={pathname}
        />
      </aside>

      {/* ── Mobil sidebar (overlay) ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-y-0 left-0 z-50 w-64 flex lg:hidden"
          >
            <SidebarContent
              isOpen={true}
              onToggle={closeMobileMenu}
              navItems={ADMIN_NAV_ITEMS}
              pathname={pathname}
              isMobile
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════
          CONȚINUT PRINCIPAL
          ═════════════════════════════════════════ */}
      <div
        className={`
          flex-1 flex flex-col min-h-screen transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
          lg:ml-64
          ${sidebarOpen ? "lg:ml-64" : "lg:ml-[72px]"}
        `}
      >
        {/* ── Top Bar ── */}
        <TopBar
          currentPage={currentPage}
          onMenuToggle={toggleMobileMenu}
        />

        {/* ── Conținut pagină ── */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 relative z-0">
          {/* Fundal decorativ subtil */}
          <div
            aria-hidden="true"
            className="fixed inset-0 z-[-1] pointer-events-none opacity-30"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(108,60,225,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(212,175,55,0.04) 0%, transparent 60%)",
            }}
          />

          {children}
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Conținut Sidebar
   ═══════════════════════════════════════════════ */

function SidebarContent({
  isOpen,
  onToggle,
  navItems,
  pathname,
  isMobile = false,
}: {
  isOpen: boolean;
  onToggle: () => void;
  navItems: AdminNavItem[];
  pathname: string;
  isMobile?: boolean;
}) {
  return (
    <div className="flex flex-col h-full bg-nexus-dark/95 backdrop-blur-xl border-r border-glass-border shadow-glass-lg">
      {/* ── Header sidebar ── */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-glass-border">
        {/* Logo / Brand */}
        <Link
          href="/admin"
          className="flex items-center gap-2.5 min-w-0 flex-1 group"
        >
          <span className="w-8 h-8 rounded-lg bg-nexus-accent/20 border border-nexus-accent/30 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:bg-nexus-accent/30 group-hover:border-nexus-glow/40 group-hover:shadow-[0_0_14px_rgba(108,60,225,0.3)]">
            <i className="fa-solid fa-shield-halved text-sm text-nexus-glow" />
          </span>
          {isOpen && (
            <span className="font-heading text-sm font-bold text-white tracking-tight truncate">
              Nexus Admin
            </span>
          )}
        </Link>

        {/* Toggle collapse (desktop) / close (mobil) */}
        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/10 hover:border-white/15 transition-all duration-200 flex-shrink-0"
          aria-label={isMobile ? "Închide meniul" : isOpen ? "Restrânge sidebar" : "Extinde sidebar"}
        >
          {isMobile ? (
            <i className="fa-solid fa-xmark text-xs" />
          ) : (
            <i
              className={`fa-solid text-xs ${
                isOpen ? "fa-angles-left" : "fa-angles-right"
              }`}
            />
          )}
        </button>
      </div>

      {/* ── Navigare ── */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={isMobile ? onToggle : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                ${
                  isActive
                    ? "bg-nexus-accent/15 border border-nexus-accent/25 text-white shadow-[0_0_12px_rgba(108,60,225,0.15)]"
                    : "text-white/50 hover:text-white/85 hover:bg-white/5 border border-transparent"
                }
                ${!isOpen && !isMobile ? "justify-center" : ""}
              `}
              title={!isOpen && !isMobile ? item.label : undefined}
            >
              {/* Icon */}
              <i
                className={`fa-solid ${item.icon} text-sm w-4 text-center flex-shrink-0 ${
                  isActive ? "text-nexus-glow" : "text-white/35 group-hover:text-white/65"
                }`}
              />

              {/* Label */}
              {(isOpen || isMobile) && (
                <span className="text-sm font-medium truncate flex-1">
                  {item.label}
                </span>
              )}

              {/* Badge */}
              {item.badge && (isOpen || isMobile) && (
                <span
                  className={`
                    text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0
                    ${
                      isActive
                        ? "bg-nexus-glow/20 text-nexus-glow border border-nexus-glow/25"
                        : "bg-white/5 text-white/40 border border-white/8"
                    }
                  `}
                >
                  {item.badge}
                </span>
              )}

              {/* Indicator activ */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-nexus-glow shadow-[0_0_6px_rgba(155,109,255,0.5)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer sidebar ── */}
      <div className="p-3 border-t border-glass-border">
        {/* Buton înapoi la site */}
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/40 hover:text-white/75 
            hover:bg-white/5 border border-transparent hover:border-white/8 transition-all duration-200 group
            ${!isOpen && !isMobile ? "justify-center" : ""}
          `}
          title={!isOpen && !isMobile ? "Vezi site-ul public" : undefined}
        >
          <i className="fa-solid fa-arrow-up-right-from-square text-xs w-4 text-center flex-shrink-0 group-hover:text-nexus-glow" />
          {(isOpen || isMobile) && (
            <span className="text-xs font-medium truncate">Vezi site-ul</span>
          )}
        </Link>

        {/* Info versiune / user */}
        {(isOpen || isMobile) && (
          <div className="mt-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-nexus-accent/20 border border-nexus-accent/25 flex items-center justify-center text-[10px] font-bold text-nexus-glow">
                A
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/70 truncate">
                  Admin
                </p>
                <p className="text-[10px] text-white/30 font-mono">
                  v1.0.0
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Top Bar
   ═══════════════════════════════════════════════ */

function TopBar({
  currentPage,
  onMenuToggle,
}: {
  currentPage: string;
  onMenuToggle: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 h-16 bg-nexus-dark/80 backdrop-blur-xl border-b border-glass-border flex items-center px-4 sm:px-6 gap-4">
      {/* ── Buton hamburger (mobil) ── */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden w-9 h-9 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white/55 hover:text-white hover:bg-white/10 hover:border-white/15 transition-all duration-200 flex-shrink-0"
        aria-label="Deschide meniul"
      >
        <i className="fa-solid fa-bars text-sm" />
      </button>

      {/* ── Titlu pagină curentă ── */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base sm:text-lg font-heading font-bold text-white truncate">
          {currentPage}
        </h1>
        <p className="text-[10px] sm:text-xs text-white/30 font-mono tracking-wide hidden sm:block">
          Panou de administrare
        </p>
      </div>

      {/* ── Acțiuni rapide ── */}
      <div className="flex items-center gap-2">
        {/* Buton notificări */}
        <button
          className="w-9 h-9 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white/45 hover:text-white/75 hover:bg-white/10 hover:border-white/15 transition-all duration-200 relative"
          aria-label="Notificări"
        >
          <i className="fa-regular fa-bell text-sm" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.5)]" />
        </button>

        {/* Buton profil */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-glass-border">
          <span className="w-8 h-8 rounded-full bg-nexus-accent/15 border border-nexus-accent/25 flex items-center justify-center text-xs font-bold text-nexus-glow">
            A
          </span>
          <span className="text-sm text-white/60 font-medium hidden md:block">
            Admin
          </span>
        </div>
      </div>
    </header>
  );
}