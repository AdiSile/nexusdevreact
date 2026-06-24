"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  GlobalPromo,
  PromoStyle,
  PromoAction,
} from "../../../../lib/types";

/* ═══════════════════════════════════════════════════════════════════════════
   PromoEditor – CRUD complet pentru promoții globale
   Suportă: listare, adăugare, editare, ștergere, reordonare,
   active/inactive, procent reducere, perioadă (start/expirare), etichetă,
   stil, acțiune, pagini excluse, dismissible.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────
   Tipuri locale extinse
   ───────────────────────────────────────────────────────── */

/** Extensie locală: adăugăm discountPercent și startsAt peste GlobalPromo */
interface PromoWithExtras extends GlobalPromo {
  discountPercent: number;
  startsAt?: string;
}

interface PromoFormData {
  text: string;
  subtext: string;
  style: PromoStyle;
  dismissible: boolean;
  isActive: boolean;
  discountPercent: number;
  startsAt: string;
  expiresAt: string;
  actionLabel: string;
  actionHref: string;
  actionVariant: PromoAction["variant"];
  actionExternal: boolean;
  pagesExcludeInput: string;
  pagesExclude: string[];
}

interface FormErrors {
  [field: string]: string;
}

/* ─────────────────────────────────────────────────────────
   Constante
   ───────────────────────────────────────────────────────── */

const PROMO_STYLES: { value: PromoStyle; label: string; icon: string; css: string }[] = [
  {
    value: "info",
    label: "Informativ",
    icon: "fa-circle-info",
    css: "from-blue-500/30 to-blue-600/10 border-blue-400/40 text-blue-200",
  },
  {
    value: "success",
    label: "Succes",
    icon: "fa-circle-check",
    css: "from-emerald-500/30 to-emerald-600/10 border-emerald-400/40 text-emerald-200",
  },
  {
    value: "warning",
    label: "Avertisment",
    icon: "fa-triangle-exclamation",
    css: "from-amber-500/30 to-amber-600/10 border-amber-400/40 text-amber-200",
  },
  {
    value: "highlight",
    label: "Evidențiat",
    icon: "fa-star",
    css: "from-purple-500/30 to-violet-600/10 border-purple-400/40 text-purple-200",
  },
  {
    value: "gradient",
    label: "Gradient",
    icon: "fa-grip-lines",
    css: "from-violet-500/40 via-fuchsia-500/30 to-gold/30 border-nexus-glow/40 text-white",
  },
];

const ACTION_VARIANTS: { value: PromoAction["variant"]; label: string }[] = [
  { value: "primary", label: "Principal" },
  { value: "secondary", label: "Secundar" },
  { value: "ghost", label: "Ghost" },
  { value: "gold", label: "Gold" },
];

function generateId(): string {
  return `promo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyFormData(): PromoFormData {
  return {
    text: "",
    subtext: "",
    style: "highlight",
    dismissible: true,
    isActive: true,
    discountPercent: 0,
    startsAt: "",
    expiresAt: "",
    actionLabel: "",
    actionHref: "#contact",
    actionVariant: "primary",
    actionExternal: false,
    pagesExcludeInput: "",
    pagesExclude: [],
  };
}

function promoToFormData(promo: PromoWithExtras): PromoFormData {
  return {
    text: promo.text,
    subtext: promo.subtext ?? "",
    style: promo.style,
    dismissible: promo.dismissible,
    isActive: promo.isActive,
    discountPercent: promo.discountPercent ?? 0,
    startsAt: promo.startsAt?.slice(0, 10) ?? "",
    expiresAt: promo.expiresAt?.slice(0, 10) ?? "",
    actionLabel: promo.action?.label ?? "",
    actionHref: promo.action?.href ?? "#contact",
    actionVariant: promo.action?.variant ?? "primary",
    actionExternal: promo.action?.external ?? false,
    pagesExcludeInput: "",
    pagesExclude: promo.pagesExclude ? [...promo.pagesExclude] : [],
  };
}

function formDataToPromo(
  form: PromoFormData,
  existing?: PromoWithExtras,
): PromoWithExtras {
  const now = new Date().toISOString();
  const hasAction = form.actionLabel.trim() && form.actionHref.trim();

  return {
    id: existing?.id ?? generateId(),
    text: form.text.trim(),
    subtext: form.subtext.trim() || undefined,
    style: form.style,
    dismissible: form.dismissible,
    isActive: form.isActive,
    discountPercent: form.discountPercent,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
    action: hasAction
      ? {
          label: form.actionLabel.trim(),
          href: form.actionHref.trim(),
          variant: form.actionVariant,
          external: form.actionExternal || undefined,
        }
      : undefined,
    pagesExclude: form.pagesExclude.length > 0 ? [...form.pagesExclude] : undefined,
    order: existing?.order ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/* ─────────────────────────────────────────────────────────
   Helper: calculează status perioadă
   ───────────────────────────────────────────────────────── */

type PeriodStatus = "upcoming" | "active" | "expired" | "indefinite";

function getPeriodStatus(
  startsAt?: string,
  expiresAt?: string,
): PeriodStatus {
  const now = Date.now();
  const start = startsAt ? new Date(startsAt).getTime() : 0;
  const end = expiresAt ? new Date(expiresAt).getTime() : Infinity;

  if (!startsAt && !expiresAt) return "indefinite";
  if (now < start) return "upcoming";
  if (now > end) return "expired";
  return "active";
}

const PERIOD_STATUS_CONFIG: Record<
  PeriodStatus,
  { label: string; icon: string; css: string }
> = {
  upcoming: {
    label: "Programată",
    icon: "fa-clock",
    css: "bg-blue-500/15 text-blue-400 border-blue-400/25",
  },
  active: {
    label: "În desfășurare",
    icon: "fa-circle-play",
    css: "bg-emerald-500/15 text-emerald-400 border-emerald-400/25",
  },
  expired: {
    label: "Expirată",
    icon: "fa-circle-stop",
    css: "bg-red-500/15 text-red-400 border-red-400/25",
  },
  indefinite: {
    label: "Permanentă",
    icon: "fa-infinity",
    css: "bg-white/5 text-white/40 border-white/10",
  },
};

/* ═════════════════════════════════════════════════════════
   Componenta principală
   ═════════════════════════════════════════════════════════ */

export interface PromoEditorProps {
  /** Lista curentă de promoții */
  promos: readonly GlobalPromo[];
  /** Callback salvare completă */
  onSave: (promos: GlobalPromo[]) => void;
  /** Callback dirty */
  onDirty: () => void;
  /** Stare salvare */
  saving: boolean;
}

export default function PromoEditor({
  promos: initialPromos,
  onSave,
  onDirty,
  saving,
}: PromoEditorProps) {
  /* ── Stare principală ── */
  const [promos, setPromos] = useState<PromoWithExtras[]>(() =>
    [...initialPromos]
      .sort((a, b) => a.order - b.order)
      .map((p) => ({
        ...p,
        discountPercent: (p as PromoWithExtras).discountPercent ?? 0,
        startsAt: (p as PromoWithExtras).startsAt,
      })),
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<PromoFormData>(emptyFormData());
  const [errors, setErrors] = useState<FormErrors>({});
  const [isNewPromo, setIsNewPromo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState<PromoStyle | "all">("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  /* ── Sincronizare date externe ── */
  useEffect(() => {
    setPromos(
      [...initialPromos]
        .sort((a, b) => a.order - b.order)
        .map((p) => ({
          ...p,
          discountPercent: (p as PromoWithExtras).discountPercent ?? 0,
          startsAt: (p as PromoWithExtras).startsAt,
        })),
    );
  }, [initialPromos]);

  /* ── Promo selectată ── */
  const selectedPromo = useMemo(
    () => promos.find((p) => p.id === selectedId) ?? null,
    [promos, selectedId],
  );

  /* ── Promoții filtrate ── */
  const filteredPromos = useMemo(() => {
    let list = promos;
    if (styleFilter !== "all") {
      list = list.filter((p) => p.style === styleFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.text.toLowerCase().includes(q) ||
          (p.subtext ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [promos, styleFilter, searchQuery]);

  /* ── Statistici ── */
  const stats = useMemo(() => {
    const now = Date.now();
    const active = promos.filter((p) => p.isActive).length;
    const inactive = promos.length - active;
    const withDiscount = promos.filter((p) => p.discountPercent > 0).length;
    const currentlyRunning = promos.filter((p) => {
      if (!p.isActive) return false;
      const status = getPeriodStatus(p.startsAt, p.expiresAt);
      return status === "active" || status === "indefinite";
    }).length;
    return { active, inactive, withDiscount, currentlyRunning, total: promos.length };
  }, [promos]);

  /* ── Selectează promo ── */
  const selectPromo = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      setIsNewPromo(false);
      setErrors({});

      if (id) {
        const promo = promos.find((p) => p.id === id);
        if (promo) {
          setForm(promoToFormData(promo));
        }
      } else {
        setForm(emptyFormData());
      }
    },
    [promos],
  );

  /* ── Promo nouă ── */
  const startNewPromo = useCallback(() => {
    setSelectedId(null);
    setIsNewPromo(true);
    setErrors({});
    setForm(emptyFormData());
  }, []);

  /* ── Actualizare câmp formular ── */
  const update = useCallback(
    (field: string, value: string | number | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      onDirty();
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [onDirty],
  );

  /* ── Pagini excluse ── */
  const addExcludedPage = useCallback(() => {
    const val = form.pagesExcludeInput.trim();
    if (!val || form.pagesExclude.includes(val)) return;
    setForm((prev) => ({
      ...prev,
      pagesExclude: [...prev.pagesExclude, val],
      pagesExcludeInput: "",
    }));
    onDirty();
  }, [form.pagesExcludeInput, form.pagesExclude, onDirty]);

  const removeExcludedPage = useCallback(
    (idx: number) => {
      setForm((prev) => ({
        ...prev,
        pagesExclude: prev.pagesExclude.filter((_, i) => i !== idx),
      }));
      onDirty();
    },
    [onDirty],
  );

  /* ── Validare ── */
  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};

    if (!form.text.trim()) errs.text = "Textul promoției este obligatoriu.";
    else if (form.text.trim().length < 3)
      errs.text = "Textul trebuie să aibă cel puțin 3 caractere.";

    if (form.discountPercent < 0)
      errs.discountPercent = "Procentul nu poate fi negativ.";
    else if (form.discountPercent > 99)
      errs.discountPercent = "Procentul maxim este 99%.";

    if (form.startsAt && form.expiresAt && form.startsAt > form.expiresAt)
      errs.expiresAt = "Data de expirare trebuie să fie după data de început.";

    if (form.actionLabel.trim() && !form.actionHref.trim())
      errs.actionHref = "Link-ul acțiunii este obligatoriu când există o etichetă.";

    if (!form.actionLabel.trim() && form.actionHref.trim() && form.actionHref !== "#contact")
      errs.actionLabel = "Eticheta acțiunii este obligatorie când există un link.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  /* ── Salvare promo curentă ── */
  const saveCurrent = useCallback(() => {
    if (!validate()) return;

    const saved = formDataToPromo(form, selectedPromo ?? undefined);

    setPromos((prev) => {
      if (isNewPromo || !selectedId) {
        saved.order = prev.length > 0 ? Math.max(...prev.map((p) => p.order)) + 1 : 1;
        return [...prev, saved];
      }
      return prev.map((p) => (p.id === selectedId ? { ...p, ...saved, id: p.id } : p));
    });

    setSelectedId(saved.id);
    setIsNewPromo(false);
    setErrors({});
  }, [form, validate, selectedPromo, selectedId, isNewPromo]);

  /* ── Ștergere promo ── */
  const deletePromo = useCallback(
    (id: string) => {
      setPromos((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setIsNewPromo(false);
        setForm(emptyFormData());
      }
      setShowDeleteConfirm(null);
      onDirty();
    },
    [selectedId, onDirty],
  );

  /* ── Toggle activ/inactiv ── */
  const toggleActive = useCallback(
    (id: string) => {
      setPromos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)),
      );
      onDirty();

      if (id === selectedId) {
        setForm((prev) => ({ ...prev, isActive: !prev.isActive }));
      }
    },
    [selectedId, onDirty],
  );

  /* ── Mută în sus/jos ── */
  const movePromo = useCallback(
    (id: string, direction: "up" | "down") => {
      setPromos((prev) => {
        const idx = prev.findIndex((p) => p.id === id);
        if (idx === -1) return prev;
        const target = direction === "up" ? idx - 1 : idx + 1;
        if (target < 0 || target >= prev.length) return prev;

        const next = [...prev];
        const tmp = next[idx].order;
        next[idx] = { ...next[idx], order: next[target].order };
        next[target] = { ...next[target], order: tmp };
        [next[idx], next[target]] = [next[target], next[idx]];
        return next;
      });
      onDirty();
    },
    [onDirty],
  );

  /* ── Submit final ── */
  const handleSaveAll = useCallback(() => {
    const ordered = promos.map((p, i) => ({ ...p, order: i + 1 }));
    const cleaned = ordered.map(({ ...rest }) => rest as GlobalPromo);
    onSave(cleaned);
  }, [promos, onSave]);

  /* ── Keyboard shortcuts ── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (selectedId || isNewPromo) {
          saveCurrent();
        } else {
          handleSaveAll();
        }
      }
    },
    [selectedId, isNewPromo, saveCurrent, handleSaveAll],
  );

  /* ═════════════════════════════════════════════════════════
     Clase input comune
     ═════════════════════════════════════════════════════════ */

  const inputClass = (field: string) =>
    `w-full bg-white/[0.04] border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 
     outline-none transition-all duration-200 font-sans ${
       errors[field]
         ? "border-red-400/60 focus:border-red-400/70 focus:ring-1 focus:ring-red-400/20"
         : "border-glass-border focus:border-nexus-glow/40 focus:ring-1 focus:ring-nexus-glow/10 hover:border-glass-border-strong"
     }`;

  /* ═════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col xl:flex-row gap-6" onKeyDown={handleKeyDown}>
      {/* ═════════════════════════════════════════
          LISTA DE PROMOȚII – Stânga
          ═════════════════════════════════════════ */}
      <div className="w-full xl:w-[380px] flex-shrink-0">
        <div className="sticky top-24 space-y-4">
          {/* Header cu statistici */}
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-bullhorn text-[10px] text-nexus-glow/60" />
              Promoții
              <span className="text-white/25 font-mono text-[10px]">
                {stats.total}
              </span>
            </h3>
            <button
              type="button"
              onClick={startNewPromo}
              className="flex items-center gap-1.5 text-[11px] font-medium text-nexus-glow bg-nexus-accent/15 hover:bg-nexus-accent/25 border border-nexus-accent/25 hover:border-nexus-accent/40 rounded-full px-3 py-1.5 transition-all duration-200"
            >
              <i className="fa-solid fa-plus text-[9px]" />
              Adaugă
            </button>
          </div>

          {/* Statistici rapide */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-xl border border-glass-border bg-white/[0.02] p-3 text-center">
              <p className="text-lg font-bold text-emerald-400">
                {stats.currentlyRunning}
              </p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                Active
              </p>
            </div>
            <div className="rounded-xl border border-glass-border bg-white/[0.02] p-3 text-center">
              <p className="text-lg font-bold text-amber-400">{stats.inactive}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                Inactive
              </p>
            </div>
            <div className="rounded-xl border border-glass-border bg-white/[0.02] p-3 text-center">
              <p className="text-lg font-bold text-gold">{stats.withDiscount}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                Cu %
              </p>
            </div>
            <div className="rounded-xl border border-glass-border bg-white/[0.02] p-3 text-center">
              <p className="text-lg font-bold text-white">{stats.total}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                Total
              </p>
            </div>
          </div>

          {/* Filtre */}
          <div className="space-y-2">
            {/* Search */}
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-white/15 text-xs" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută promoție..."
                className="w-full bg-white/[0.03] border border-glass-border rounded-xl pl-10 pr-4 py-2 text-white text-xs placeholder:text-white/15 outline-none focus:border-nexus-glow/30 transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50"
                >
                  <i className="fa-solid fa-xmark text-[10px]" />
                </button>
              )}
            </div>

            {/* Style filter pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setStyleFilter("all")}
                className={`text-[10px] font-medium rounded-full px-2.5 py-1 transition-all duration-200 ${
                  styleFilter === "all"
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-white/35 border border-transparent hover:text-white/60"
                }`}
              >
                Toate
              </button>
              {PROMO_STYLES.map((s) => {
                const count = promos.filter((p) => p.style === s.value).length;
                if (count === 0) return null;
                return (
                  <button
                    key={s.value}
                    onClick={() =>
                      setStyleFilter(styleFilter === s.value ? "all" : s.value)
                    }
                    className={`text-[10px] font-medium rounded-full px-2.5 py-1 transition-all duration-200 flex items-center gap-1 ${
                      styleFilter === s.value
                        ? "bg-white/10 text-white border border-white/20"
                        : "text-white/35 border border-transparent hover:text-white/60"
                    }`}
                  >
                    <i className={`fa-solid ${s.icon} text-[8px]`} />
                    {s.label}
                    <span className="text-[9px] opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista promoții */}
          <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-thin">
            <AnimatePresence initial={false}>
              {filteredPromos.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <i className="fa-solid fa-bullhorn text-2xl text-white/10 block mb-2" />
                  <p className="text-xs text-white/25">
                    {searchQuery || styleFilter !== "all"
                      ? "Nicio promoție nu se potrivește filtrelor."
                      : "Nicio promoție adăugată."}
                  </p>
                </motion.div>
              ) : (
                filteredPromos.map((promo, idx) => {
                  const isSelected = selectedId === promo.id;
                  const periodStatus = getPeriodStatus(
                    promo.startsAt,
                    promo.expiresAt,
                  );
                  const statusCfg = PERIOD_STATUS_CONFIG[periodStatus];
                  const styleCfg = PROMO_STYLES.find(
                    (s) => s.value === promo.style,
                  );

                  return (
                    <motion.div
                      key={promo.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={() => selectPromo(promo.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group ${
                          isSelected
                            ? "bg-nexus-accent/15 border border-nexus-accent/30"
                            : "bg-white/[0.02] border border-transparent hover:border-glass-border hover:bg-white/[0.04]"
                        }`}
                      >
                        {/* Icon */}
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm transition-all duration-200 ${
                            isSelected
                              ? "bg-nexus-accent/25 text-nexus-glow"
                              : "bg-white/5 text-white/30 group-hover:text-white/50"
                          }`}
                        >
                          <i
                            className={`fa-solid ${styleCfg?.icon ?? "fa-bullhorn"}`}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium truncate ${
                                isSelected ? "text-white" : "text-white/70"
                              }`}
                            >
                              {promo.text}
                            </span>
                            {!promo.isActive && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400/70 border border-red-400/15 flex-shrink-0">
                                inactiv
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {/* Stil badge */}
                            {styleCfg && (
                              <span className="text-[9px] text-white/20 flex items-center gap-1">
                                <i
                                  className={`fa-solid ${styleCfg.icon} text-[7px]`}
                                />
                                {styleCfg.label}
                              </span>
                            )}

                            {/* Discount badge */}
                            {promo.discountPercent > 0 && (
                              <span className="text-[9px] font-bold text-gold/80 bg-gold/10 rounded-full px-1.5 py-0.5">
                                -{promo.discountPercent}%
                              </span>
                            )}

                            {/* Perioadă status */}
                            <span
                              className={`text-[9px] font-medium rounded-full px-1.5 py-0.5 border ${statusCfg.css}`}
                            >
                              {statusCfg.label}
                            </span>
                          </div>
                        </div>

                        {/* Acțiuni rapide */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              movePromo(promo.id, "up");
                            }}
                            disabled={idx === 0}
                            className="p-1 rounded text-white/20 hover:text-white/60 disabled:opacity-20"
                            title="Mută în sus"
                          >
                            <i className="fa-solid fa-chevron-up text-[10px]" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              movePromo(promo.id, "down");
                            }}
                            disabled={idx === filteredPromos.length - 1}
                            className="p-1 rounded text-white/20 hover:text-white/60 disabled:opacity-20"
                            title="Mută în jos"
                          >
                            <i className="fa-solid fa-chevron-down text-[10px]" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleActive(promo.id);
                            }}
                            className={`p-1 rounded transition-colors ${
                              promo.isActive
                                ? "text-emerald-400/60 hover:text-emerald-400"
                                : "text-white/15 hover:text-amber-400/70"
                            }`}
                            title={
                              promo.isActive ? "Dezactivează" : "Activează"
                            }
                          >
                            <i
                              className={`fa-solid ${
                                promo.isActive ? "fa-eye" : "fa-eye-slash"
                              } text-[10px]`}
                            />
                          </button>
                        </div>
                      </button>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════
          EDITOR / FORMULAR – Dreapta
          ═════════════════════════════════════════ */}
      <div className="flex-1 min-w-0" ref={formRef}>
        {!selectedId && !isNewPromo ? (
          /* Stare goală */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-glass-border flex items-center justify-center mb-5">
              <i className="fa-solid fa-bullhorn text-2xl text-white/15" />
            </div>
            <h3 className="text-lg font-heading font-bold text-white/40 mb-2">
              Editor Promoții
            </h3>
            <p className="text-sm text-white/25 max-w-md leading-relaxed mb-6">
              Selectează o promoție din listă pentru a o edita sau creează una
              nouă. Configurează textul, procentul de reducere, perioada și
              stilul vizual.
            </p>
            <button
              type="button"
              onClick={startNewPromo}
              className="glass-btn text-sm px-6 py-2.5"
            >
              <i className="fa-solid fa-plus text-xs" />
              <span>Promoție nouă</span>
            </button>
            {promos.length === 0 && (
              <p className="text-[10px] text-white/15 mt-4 font-mono">
                Nu există promoții configurate.
              </p>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedId ?? "new"}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                    {isNewPromo ? "Promoție nouă" : "Editare promoție"}
                  </h3>
                  {Object.keys(errors).length > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-red-400/80 bg-red-500/10 border border-red-400/20 rounded-full px-2.5 py-0.5">
                      <i className="fa-solid fa-triangle-exclamation text-[9px]" />
                      {Object.keys(errors).length} erori
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isNewPromo && selectedId && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(selectedId)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-red-400/70 hover:text-red-400 bg-red-500/8 hover:bg-red-500/15 border border-red-400/15 rounded-full px-3 py-1.5 transition-all duration-200"
                    >
                      <i className="fa-solid fa-trash-can text-[9px]" />
                      Șterge
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={saveCurrent}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400/80 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/20 rounded-full px-3 py-1.5 transition-all duration-200"
                  >
                    <i className="fa-solid fa-check text-[9px]" />
                    {isNewPromo ? "Adaugă în listă" : "Actualizează"}
                  </button>
                </div>
              </div>

              {/* ── Confirmare ștergere ── */}
              <AnimatePresence>
                {showDeleteConfirm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-red-400/25 bg-red-500/[0.06] p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm text-red-300/80">
                        <i className="fa-solid fa-triangle-exclamation" />
                        Ești sigur că vrei să ștergi această promoție? Acțiunea
                        este ireversibilă.
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(null)}
                          className="text-xs text-white/40 hover:text-white/70 px-3 py-1.5"
                        >
                          Anulează
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePromo(showDeleteConfirm)}
                          className="text-xs font-medium text-red-400 bg-red-500/15 border border-red-400/25 rounded-lg px-4 py-1.5"
                        >
                          Șterge definitiv
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Secțiunea: Etichetă & Conținut ── */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-tag text-[10px] text-nexus-glow/60" />
                  Etichetă & Conținut
                </legend>

                <Field
                  label="Text promoție (etichetă)"
                  field="promo-text"
                  error={errors.text}
                  required
                >
                  <input
                    id="promo-text"
                    type="text"
                    value={form.text}
                    onChange={(e) => update("text", e.target.value)}
                    placeholder="Reduceri de vară — 25% OFF!"
                    className={inputClass("text")}
                    aria-required="true"
                    aria-invalid={!!errors.text}
                  />
                  <CharCount current={form.text.length} max={120} />
                </Field>

                <Field label="Subtext (opțional)" field="promo-subtext">
                  <input
                    id="promo-subtext"
                    type="text"
                    value={form.subtext}
                    onChange={(e) => update("subtext", e.target.value)}
                    placeholder="Ofertă limitată pentru proiecte noi."
                    className={inputClass("subtext")}
                  />
                  <CharCount current={form.subtext.length} max={180} />
                </Field>
              </fieldset>

              {/* ── Secțiunea: Reducere & Perioadă ── */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-percent text-[10px] text-nexus-glow/60" />
                  Reducere & Perioadă
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Procent reducere */}
                  <Field
                    label="Procent reducere (%)"
                    field="promo-discount"
                    error={errors.discountPercent}
                  >
                    <div className="relative">
                      <input
                        id="promo-discount"
                        type="number"
                        min={0}
                        max={99}
                        value={form.discountPercent}
                        onChange={(e) =>
                          update(
                            "discountPercent",
                            Math.max(0, Math.min(99, Number(e.target.value) || 0)),
                          )
                        }
                        className={`${inputClass("discountPercent")} pr-10 font-mono text-lg font-bold`}
                        aria-required="true"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gold font-bold text-sm pointer-events-none">
                        %
                      </span>
                    </div>
                    {/* Previzualizare reducere */}
                    {form.discountPercent > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold"
                            style={{ width: `${form.discountPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gold font-mono">
                          -{form.discountPercent}%
                        </span>
                      </div>
                    )}
                  </Field>

                  {/* Data început */}
                  <Field label="Data început (opțional)" field="promo-starts">
                    <input
                      id="promo-starts"
                      type="date"
                      value={form.startsAt}
                      onChange={(e) => update("startsAt", e.target.value)}
                      className={inputClass("startsAt")}
                    />
                  </Field>

                  {/* Data expirare */}
                  <Field
                    label="Data expirării"
                    field="promo-expires"
                    error={errors.expiresAt}
                  >
                    <input
                      id="promo-expires"
                      type="date"
                      value={form.expiresAt}
                      onChange={(e) => update("expiresAt", e.target.value)}
                      className={inputClass("expiresAt")}
                    />
                  </Field>
                </div>

                {/* Status perioadă indicator */}
                {(form.startsAt || form.expiresAt) && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-white/30">Status perioadă:</span>
                    {(() => {
                      const status = getPeriodStatus(
                        form.startsAt || undefined,
                        form.expiresAt || undefined,
                      );
                      const cfg = PERIOD_STATUS_CONFIG[status];
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2.5 py-1 border ${cfg.css}`}
                        >
                          <i className={`fa-solid ${cfg.icon} text-[9px]`} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </fieldset>

              {/* ── Secțiunea: Aspect & Comportament ── */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-palette text-[10px] text-nexus-glow/60" />
                  Aspect & Comportament
                </legend>

                {/* Selector stil */}
                <div>
                  <span className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">
                    Stil vizual
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PROMO_STYLES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => update("style", s.value)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border transition-all duration-200 ${
                          form.style === s.value
                            ? `bg-gradient-to-r ${s.css} shadow-lg`
                            : "bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
                        }`}
                      >
                        <i className={`fa-solid ${s.icon} text-[9px]`} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Switch-uri */}
                <div className="flex flex-wrap gap-6">
                  <ToggleField
                    label="Activă"
                    checked={form.isActive}
                    onChange={(v) => update("isActive", v)}
                  />
                  <ToggleField
                    label="Se poate închide (dismissible)"
                    checked={form.dismissible}
                    onChange={(v) => update("dismissible", v)}
                  />
                </div>
              </fieldset>

              {/* ── Secțiunea: Acțiune (buton CTA) ── */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-arrow-pointer text-[10px] text-nexus-glow/60" />
                  Acțiune (buton CTA)
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Etichetă buton"
                    field="promo-action-label"
                    error={errors.actionLabel}
                  >
                    <input
                      id="promo-action-label"
                      type="text"
                      value={form.actionLabel}
                      onChange={(e) => update("actionLabel", e.target.value)}
                      placeholder="Vezi oferta"
                      className={inputClass("actionLabel")}
                    />
                  </Field>
                  <Field
                    label="Link buton"
                    field="promo-action-href"
                    error={errors.actionHref}
                  >
                    <input
                      id="promo-action-href"
                      type="text"
                      value={form.actionHref}
                      onChange={(e) => update("actionHref", e.target.value)}
                      placeholder="#contact"
                      className={inputClass("actionHref")}
                    />
                  </Field>
                </div>

                {form.actionLabel.trim() && (
                  <div className="flex flex-wrap gap-4">
                    {/* Variantă buton */}
                    <div>
                      <span className="block text-[10px] font-medium text-white/35 uppercase tracking-wider mb-1.5">
                        Variantă
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {ACTION_VARIANTS.map((v) => (
                          <button
                            key={v.value}
                            type="button"
                            onClick={() => update("actionVariant", v.value)}
                            className={`text-[10px] font-medium rounded-full px-3 py-1 border transition-all duration-200 ${
                              form.actionVariant === v.value
                                ? "bg-nexus-accent/20 border-nexus-accent/40 text-white"
                                : "bg-white/5 border-white/10 text-white/35 hover:text-white/60"
                            }`}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* External */}
                    <div className="flex items-end pb-0.5">
                      <ToggleField
                        label="Link extern"
                        checked={form.actionExternal}
                        onChange={(v) => update("actionExternal", v)}
                      />
                    </div>
                  </div>
                )}
              </fieldset>

              {/* ── Secțiunea: Pagini excluse ── */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-ban text-[10px] text-nexus-glow/60" />
                  Pagini excluse (opțional)
                </legend>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.pagesExcludeInput}
                    onChange={(e) => update("pagesExcludeInput", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addExcludedPage();
                      }
                    }}
                    placeholder="/admin, /checkout"
                    className={inputClass("pagesExclude")}
                  />
                  <button
                    type="button"
                    onClick={addExcludedPage}
                    className="p-2.5 rounded-xl bg-white/[0.04] border border-glass-border text-white/40 hover:text-white/70 hover:border-glass-border-strong transition-all"
                  >
                    <i className="fa-solid fa-plus text-xs" />
                  </button>
                </div>

                {form.pagesExclude.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence initial={false}>
                      {form.pagesExclude.map((page, idx) => (
                        <motion.span
                          key={`${page}-${idx}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="inline-flex items-center gap-1.5 text-[11px] text-white/50 bg-white/[0.04] border border-white/[0.08] rounded-full pl-3 pr-1.5 py-1 font-mono"
                        >
                          {page}
                          <button
                            type="button"
                            onClick={() => removeExcludedPage(idx)}
                            className="p-0.5 rounded-full text-white/20 hover:text-red-400/60 transition-colors"
                          >
                            <i className="fa-solid fa-xmark text-[9px]" />
                          </button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </fieldset>

              {/* ── Previzualizare banner promo ── */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-eye text-[10px] text-nexus-glow/60" />
                  Previzualizare banner
                </legend>

                <div
                  className={`relative rounded-glass-lg border bg-gradient-to-r overflow-hidden ${
                    PROMO_STYLES.find((s) => s.value === form.style)?.css ??
                    "from-white/5 to-white/[0.02] border-glass-border"
                  }`}
                >
                  {/* Fundal decorativ */}
                  <div className="absolute inset-0 bg-[url('/images/promo-bg.jpg')] bg-cover bg-center opacity-10 pointer-events-none" />

                  <div className="relative px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Iconiță */}
                      <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <i
                          className={`fa-solid ${
                            PROMO_STYLES.find((s) => s.value === form.style)
                              ?.icon ?? "fa-bullhorn"
                          } text-sm text-white/80`}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white/95 truncate">
                          {form.text.trim() || "Text promoție..."}
                        </p>
                        {form.subtext.trim() && (
                          <p className="text-xs text-white/60 mt-0.5 truncate">
                            {form.subtext}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {form.discountPercent > 0 && (
                            <span className="text-[10px] font-bold text-gold bg-gold/10 rounded-full px-2 py-0.5">
                              -{form.discountPercent}%
                            </span>
                          )}
                          {(form.startsAt || form.expiresAt) && (
                            <span className="text-[10px] text-white/30 font-mono">
                              {form.startsAt
                                ? new Date(form.startsAt).toLocaleDateString(
                                    "ro-RO",
                                  )
                                : "..."}
                              {" → "}
                              {form.expiresAt
                                ? new Date(form.expiresAt).toLocaleDateString(
                                    "ro-RO",
                                  )
                                : "..."}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Buton acțiune + dismiss */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {form.actionLabel.trim() && (
                        <span
                          className={`text-[11px] font-medium rounded-full px-4 py-1.5 border transition-all ${
                            form.actionVariant === "gold"
                              ? "bg-gold/20 border-gold/40 text-gold"
                              : form.actionVariant === "ghost"
                                ? "bg-transparent border-white/20 text-white/80"
                                : form.actionVariant === "secondary"
                                  ? "bg-white/[0.06] border-white/20 text-white/70"
                                  : "bg-white/15 border-white/30 text-white"
                          }`}
                        >
                          {form.actionLabel}
                          {form.actionExternal && (
                            <i className="fa-solid fa-arrow-up-right-from-square text-[8px] ml-1" />
                          )}
                        </span>
                      )}
                      {form.dismissible && (
                        <span className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-[10px]">
                          <i className="fa-solid fa-xmark" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* ── Buton salvare globală ── */}
              <SubmitButton
                saving={saving}
                hasErrors={Object.keys(errors).length > 0}
                hasChanges={
                  isNewPromo ||
                  (selectedPromo !== null &&
                    JSON.stringify(formDataToPromo(form)) !==
                      JSON.stringify(selectedPromo))
                }
                promoCount={promos.length}
                onSaveAll={handleSaveAll}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   Componente utilitare
   ═════════════════════════════════════════════════════════ */

function Field({
  label,
  field,
  error,
  required = false,
  children,
}: {
  label: string;
  field: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const errorId = `${field}-err`;

  return (
    <div>
      <label
        htmlFor={field}
        className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider"
      >
        {label}
        {required && (
          <span className="text-red-400/70 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-xs text-red-400/80 flex items-center gap-1.5"
        >
          <i className="fa-solid fa-circle-exclamation text-[10px]" />
          {error}
        </p>
      )}
    </div>
  );
}

function CharCount({ current, max }: { current: number; max: number }) {
  const ratio = current / max;
  const isOver = current > max;
  const isWarning = ratio > 0.85 && !isOver;

  return (
    <div className="flex items-center justify-end gap-2 mt-1.5">
      <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isOver
              ? "bg-red-400/60"
              : isWarning
                ? "bg-amber-400/60"
                : "bg-nexus-glow/50"
          }`}
          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
        />
      </div>
      <span
        className={`text-[10px] font-mono tabular-nums ${
          isOver
            ? "text-red-400/70"
            : isWarning
              ? "text-amber-400/60"
              : "text-white/25"
        }`}
        aria-live="polite"
      >
        {current}/{max}
        {isOver && " — depășit"}
      </span>
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 group"
    >
      <div
        className={`
          w-10 h-5 rounded-full relative transition-all duration-300
          ${checked ? "bg-emerald-500/70 shadow-[0_0_10px_rgba(52,211,153,0.3)]" : "bg-white/10"}
        `}
      >
        <div
          className={`
            absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300
            ${checked ? "left-[22px]" : "left-0.5"}
          `}
        />
      </div>
      <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">
        {label}
      </span>
    </button>
  );
}

function SubmitButton({
  saving,
  hasErrors,
  hasChanges,
  promoCount,
  onSaveAll,
}: {
  saving: boolean;
  hasErrors: boolean;
  hasChanges: boolean;
  promoCount: number;
  onSaveAll: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-glass-border">
      <button
        type="button"
        onClick={onSaveAll}
        disabled={saving || hasErrors || promoCount === 0}
        className={`
          glass-btn text-sm px-6 py-2.5
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
        `}
        aria-busy={saving}
      >
        {saving ? (
          <>
            <span
              className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white animate-spin"
              aria-hidden="true"
            />
            <span>Se salvează...</span>
          </>
        ) : (
          <>
            <i className="fa-solid fa-floppy-disk text-xs" />
            <span>
              Salvează toate promoțiile ({promoCount})
            </span>
          </>
        )}
      </button>

      <div className="flex items-center gap-3">
        {!saving && (
          <span className="text-[10px] text-white/20 font-mono hidden sm:inline">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[9px]">
              Ctrl+S
            </kbd>
            {"  "}salvează
          </span>
        )}

        {hasErrors && (
          <span className="text-[10px] text-red-400/50 font-mono flex items-center gap-1">
            <i className="fa-solid fa-circle-exclamation text-[9px]" />
            Verifică câmpurile
          </span>
        )}

        {!hasErrors && hasChanges && !saving && (
          <span
            className="w-2 h-2 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.5)] flex-shrink-0"
            title="Modificări nesalvate"
          />
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   Exporturi denumite
   ═════════════════════════════════════════════════════════ */

export type { PromoWithExtras, PromoFormData, FormErrors, PeriodStatus };
export { PROMO_STYLES, PERIOD_STATUS_CONFIG, getPeriodStatus };