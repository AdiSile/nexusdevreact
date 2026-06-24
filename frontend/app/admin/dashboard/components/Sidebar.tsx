"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faChartLine,
  faLayerGroup,
  faBriefcase,
  faDiagramProject,
  faEnvelope,
  faCircleQuestion,
  faBullhorn,
  faGear,
  faMagnifyingGlassChart,
  faShareNodes,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faBars,
  faHouse,
  faFileLines,
  faDatabase,
  faUsers,
  faCalendarCheck,
  faCreditCard,
  faBell,
  faArrowRightFromBracket,
  faPalette,
  faGlobe,
  faLock,
  faUserGear,
  faCode,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/* ─────────────────────────────────────────────
   Tipuri
   ───────────────────────────────────────────── */

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: IconDefinition;
  badge?: string | number;
  badgeVariant?: "default" | "warning" | "danger" | "success";
  disabled?: boolean;
}

export interface SidebarSection {
  id: string;
  label: string;
  icon: IconDefinition;
  items: SidebarNavItem[];
  /** Colapsat implicit? */
  defaultCollapsed?: boolean;
}

export interface SidebarProps {
  /** Secțiunile de navigare */
  sections: SidebarSection[];
  /** URL-ul curent (pentru evidențiere item activ) */
  currentPath?: string;
  /** Callback la click pe un item */
  onNavigate?: (href: string) => void;
  /** Clasă CSS suplimentară */
  className?: string;
  /** Logo / brand */
  brandLabel?: string;
  brandHref?: string;
  /** Buton logout */
  onLogout?: () => void;
  logoutLabel?: string;
  /** Utilizator curent */
  user?: {
    name: string;
    email: string;
    avatarUrl?: string;
    role?: string;
  };
}

/* ─────────────────────────────────────────────
   Secțiuni implicite (exportate pentru reutilizare)
   ───────────────────────────────────────────── */

export const DEFAULT_ADMIN_SECTIONS: SidebarSection[] = [
  {
    id: "principal",
    label: "Principal",
    icon: faHouse,
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: faGaugeHigh },
      { label: "Analytics", href: "/admin/dashboard/analytics", icon: faChartLine, badge: "nou", badgeVariant: "success" },
    ],
  },
  {
    id: "continut",
    label: "Conținut",
    icon: faLayerGroup,
    items: [
      { label: "Servicii", href: "/admin/dashboard/services", icon: faBriefcase },
      { label: "Portofoliu", href: "/admin/dashboard/portfolio", icon: faPalette },
      { label: "Proces", href: "/admin/dashboard/process", icon: faDiagramProject },
      { label: "Pagini", href: "/admin/dashboard/pages", icon: faFileLines },
    ],
  },
  {
    id: "comunicare",
    label: "Comunicare",
    icon: faEnvelope,
    defaultCollapsed: true,
    items: [
      { label: "Mesaje", href: "/admin/dashboard/messages", icon: faEnvelope, badge: 3, badgeVariant: "danger" },
      { label: "FAQ", href: "/admin/dashboard/faq", icon: faCircleQuestion },
      { label: "Promo-uri", href: "/admin/dashboard/promos", icon: faBullhorn },
    ],
  },
  {
    id: "clienti",
    label: "Clienți",
    icon: faUsers,
    defaultCollapsed: true,
    items: [
      { label: "Contacte", href: "/admin/dashboard/contacts", icon: faUsers },
      { label: "Programări", href: "/admin/dashboard/appointments", icon: faCalendarCheck },
      { label: "Facturare", href: "/admin/dashboard/billing", icon: faCreditCard },
    ],
  },
  {
    id: "setari",
    label: "Setări",
    icon: faGear,
    defaultCollapsed: true,
    items: [
      { label: "Generale", href: "/admin/dashboard/settings", icon: faGear },
      { label: "SEO", href: "/admin/dashboard/settings/seo", icon: faMagnifyingGlassChart },
      { label: "Social", href: "/admin/dashboard/settings/social", icon: faShareNodes },
      { label: "API & Webhooks", href: "/admin/dashboard/settings/api", icon: faCode },
    ],
  },
];

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

const badgeColors: Record<string, string> = {
  default: "bg-white/10 text-white/70",
  warning: "bg-amber-500/20 text-amber-400",
  danger: "bg-red-500/20 text-red-400",
  success: "bg-emerald-500/20 text-emerald-400",
};

function isActiveItem(href: string, currentPath: string): boolean {
  if (href === currentPath) return true;
  // Sub-rută activă (ex: /admin/dashboard/settings/seo e activ când suntem pe /admin/dashboard/settings)
  if (href !== "/admin/dashboard" && currentPath.startsWith(href + "/")) return true;
  return false;
}

/* ─────────────────────────────────────────────
   Componenta Sidebar
   ───────────────────────────────────────────── */

export default function Sidebar({
  sections,
  currentPath = "/admin/dashboard",
  onNavigate,
  className = "",
  brandLabel = "Nexus Admin",
  brandHref = "/admin/dashboard",
  onLogout,
  logoutLabel = "Deconectare",
  user,
}: SidebarProps) {
  /* ── Stare sidebar colapsat (pictograme mici) ── */
  const [collapsed, setCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  /* ── Stare secțiuni colapsabile ── */
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    sections.forEach((s) => {
      if (s.defaultCollapsed) initial.add(s.id);
    });
    return initial;
  });

  /* ── Toggle secțiune ── */
  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  /* ── Toggle sidebar (colaps general) ── */
  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  /* ── Shortcut tastatură Ctrl+B pentru toggle sidebar ── */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCollapsed]);

  /* ── Click outside pentru mobile (opțional) ── */
  // Nu implementat aici; se poate adăuga într-un wrapper.

  /* ── Variante animație ── */
  const sidebarVariants = {
    expanded: { width: 272 },
    collapsed: { width: 72 },
  };

  const sectionContentVariants = {
    open: { height: "auto", opacity: 1, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
    closed: { height: 0, opacity: 0, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } },
  };

  const chevronVariants = {
    open: { rotate: 0 },
    closed: { rotate: -90 },
  };

  /* ── Render ── */
  return (
    <motion.aside
      ref={sidebarRef}
      initial="expanded"
      animate={collapsed ? "collapsed" : "expanded"}
      variants={sidebarVariants}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className={`relative flex flex-col h-screen bg-[#0B0A14] border-r border-white/[0.06] overflow-hidden select-none ${className}`}
    >
      {/* ═════════════════════════════════════════
          HEADER / BRAND
          ═════════════════════════════════════════ */}
      <div className="flex items-center h-16 px-4 border-b border-white/[0.06] shrink-0">
        {/* Logo / brand link */}
        <a
          href={brandHref}
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault();
              onNavigate(brandHref);
            }
          }}
          className="flex items-center gap-3 min-w-0 overflow-hidden"
          title={brandLabel}
        >
          {/* Iconiță brand */}
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg shadow-violet-900/30 shrink-0">
            <FontAwesomeIcon
              icon={faDatabase}
              className="text-white w-4 h-4"
            />
            {/* Dot indicator */}
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0B0A14]" />
          </div>

          {/* Text brand (ascuns când colapsat) */}
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                key="brand-text"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="text-white font-heading font-bold text-lg tracking-tight truncate"
              >
                {brandLabel}
              </motion.span>
            )}
          </AnimatePresence>
        </a>

        {/* Buton toggle collapse */}
        <button
          onClick={toggleCollapsed}
          className="ml-auto p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors duration-200 shrink-0"
          title={collapsed ? "Extinde meniul (Ctrl+B)" : "Restrânge meniul (Ctrl+B)"}
          aria-label={collapsed ? "Extinde sidebar" : "Restrânge sidebar"}
        >
          <FontAwesomeIcon
            icon={collapsed ? faBars : faChevronLeft}
            className="w-4 h-4"
          />
        </button>
      </div>

      {/* ═════════════════════════════════════════
          NAVIGARE – secțiuni
          ═════════════════════════════════════════ */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-1 scrollbar-thin">
        {sections.map((section) => {
          const isSectionCollapsed = collapsedSections.has(section.id);
          const hasActiveChild = section.items.some((item) =>
            isActiveItem(item.href, currentPath),
          );

          return (
            <div key={section.id} className="group/section">
              {/* ── Header secțiune (collapsable) ── */}
              <button
                onClick={() => {
                  // În mod colapsat, extinde sidebar-ul + deschide secțiunea
                  if (collapsed) {
                    setCollapsed(false);
                    setCollapsedSections((prev) => {
                      const next = new Set(prev);
                      next.delete(section.id);
                      return next;
                    });
                    return;
                  }
                  toggleSection(section.id);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  hasActiveChild && isSectionCollapsed
                    ? "text-violet-400"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
                title={collapsed ? section.label : undefined}
              >
                {/* Iconiță secțiune */}
                <FontAwesomeIcon
                  icon={section.icon}
                  className={`w-4 h-4 shrink-0 ${
                    hasActiveChild && isSectionCollapsed ? "text-violet-400" : ""
                  }`}
                />

                {/* Label secțiune */}
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      key={`sec-label-${section.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 text-left truncate"
                    >
                      {section.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Săgeată collapse (doar când nu e collapsed sidebar-ul) */}
                {!collapsed && (
                  <motion.span
                    variants={chevronVariants}
                    animate={isSectionCollapsed ? "closed" : "open"}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className="w-3 h-3 text-current"
                    />
                  </motion.span>
                )}
              </button>

              {/* ── Item-uri secțiune ── */}
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div
                    key={`sec-content-${section.id}`}
                    variants={sectionContentVariants}
                    initial="closed"
                    animate={isSectionCollapsed ? "closed" : "open"}
                    exit="closed"
                    className="overflow-hidden"
                  >
                    <div className="ml-2 mt-1 space-y-0.5 border-l border-white/[0.04] pl-2">
                      {section.items.map((item) => {
                        const active = isActiveItem(item.href, currentPath);
                        const disabled = item.disabled;

                        return (
                          <a
                            key={item.href}
                            href={disabled ? undefined : item.href}
                            onClick={(e) => {
                              if (disabled) {
                                e.preventDefault();
                                return;
                              }
                              if (onNavigate) {
                                e.preventDefault();
                                onNavigate(item.href);
                              }
                            }}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group/item ${
                              active
                                ? "bg-violet-600/10 text-violet-400 font-medium border-l-[3px] border-violet-500 -ml-[calc(0.5rem+1px)] pl-[calc(0.75rem-3px)]"
                                : disabled
                                  ? "text-white/15 cursor-not-allowed"
                                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.04] border-l-[3px] border-transparent -ml-[calc(0.5rem+1px)] pl-[calc(0.75rem-3px)]"
                            }`}
                            title={item.label}
                            aria-current={active ? "page" : undefined}
                          >
                            {/* Iconiță item */}
                            <FontAwesomeIcon
                              icon={item.icon}
                              className={`w-4 h-4 shrink-0 ${
                                active
                                  ? "text-violet-400"
                                  : disabled
                                    ? "text-white/10"
                                    : "text-white/30 group-hover/item:text-white/60"
                              } transition-colors duration-200`}
                            />

                            <span className="flex-1 truncate">{item.label}</span>

                            {/* Badge */}
                            {item.badge !== undefined && item.badge !== null && (
                              <span
                                className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none shrink-0 ${
                                  badgeColors[item.badgeVariant ?? "default"] ?? badgeColors.default
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tooltip rapid când sidebar-ul e colapsat */}
              {collapsed && section.items.length > 0 && (
                <div className="hidden group-hover/section:block absolute left-[72px] mt-[-36px] z-50">
                  {/* Va fi gestionat prin CSS / poziționare */}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ═════════════════════════════════════════
          FOOTER – utilizator + logout
          ═════════════════════════════════════════ */}
      <div className="shrink-0 border-t border-white/[0.06] p-3">
        {/* Utilizator */}
        {user && (
          <div
            className={`flex items-center gap-3 px-2 py-2 rounded-lg ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/10">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
              {/* Online dot */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0B0A14]" />
            </div>

            {/* Info utilizator */}
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  key="user-info"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="text-white/90 text-sm font-medium truncate leading-tight">
                    {user.name}
                  </p>
                  {user.role && (
                    <p className="text-white/35 text-xs truncate leading-tight mt-0.5">
                      {user.role}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Buton logout */}
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-white/35 hover:text-red-400 hover:bg-red-500/8 transition-all duration-200 text-sm ${
            collapsed ? "justify-center" : ""
          }`}
          title={logoutLabel}
        >
          <FontAwesomeIcon
            icon={faArrowRightFromBracket}
            className="w-4 h-4 shrink-0"
          />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                key="logout-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="truncate"
              >
                {logoutLabel}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Hint scurtătură tastatură */}
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.p
              key="shortcut-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-[10px] text-white/25 text-center mt-2 select-none"
            >
              <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[9px] font-mono">
                Ctrl+B
              </kbd>{" "}
              restrânge meniul
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

/* ─────────────────────────────────────────────
   Exporturi denumite
   ───────────────────────────────────────────── */

export { badgeColors, isActiveItem };
export type { IconDefinition };