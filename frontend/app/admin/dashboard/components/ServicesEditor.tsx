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
  Service,
  ServiceFeature,
  ServicePricingTier,
} from "../../../../lib/types";

/* ═══════════════════════════════════════════════════════════════════════════
   ServicesEditor – CRUD complet pentru servicii
   Suportă: listare, adăugare, editare, ștergere, reordonare,
   prețuri, reduceri, categorii, toggle activ/inactiv.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────
   Tipuri locale
   ───────────────────────────────────────────────────────── */

type ServiceCategory =
  | "development"
  | "design"
  | "ecommerce"
  | "mobile"
  | "consulting"
  | "infrastructure"
  | "marketing";

const CATEGORIES: { value: ServiceCategory | ""; label: string; icon: string }[] = [
  { value: "", label: "Fără categorie", icon: "fa-layer-group" },
  { value: "development", label: "Dezvoltare", icon: "fa-code" },
  { value: "design", label: "Design", icon: "fa-palette" },
  { value: "ecommerce", label: "E-Commerce", icon: "fa-shopping-cart" },
  { value: "mobile", label: "Mobile", icon: "fa-mobile-screen" },
  { value: "consulting", label: "Consultanță", icon: "fa-comments" },
  { value: "infrastructure", label: "Infrastructură", icon: "fa-server" },
  { value: "marketing", label: "Marketing", icon: "fa-bullhorn" },
];

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  development: "bg-blue-500/20 text-blue-400 border-blue-400/30",
  design: "bg-purple-500/20 text-purple-400 border-purple-400/30",
  ecommerce: "bg-emerald-500/20 text-emerald-400 border-emerald-400/30",
  mobile: "bg-orange-500/20 text-orange-400 border-orange-400/30",
  consulting: "bg-amber-500/20 text-amber-400 border-amber-400/30",
  infrastructure: "bg-cyan-500/20 text-cyan-400 border-cyan-400/30",
  marketing: "bg-pink-500/20 text-pink-400 border-pink-400/30",
};

/* Extindem Service cu category local */
interface ServiceWithCategory extends Service {
  category?: ServiceCategory | "";
}

interface ServiceFormData {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  longDescription: string;
  icon: string;
  imageUrl: string;
  category: ServiceCategory | "";
  isActive: boolean;
  features: ServiceFeature[];
  pricing: ServicePricingTier[];
  techStack: string[];
}

interface FormErrors {
  [field: string]: string;
}

/* ─────────────────────────────────────────────────────────
   Constante
   ───────────────────────────────────────────────────────── */

const AVAILABLE_ICONS: string[] = [
  "fa-code",
  "fa-shopping-cart",
  "fa-mobile-alt",
  "fa-mobile-screen",
  "fa-file-alt",
  "fa-cloud",
  "fa-plug",
  "fa-chart-line",
  "fa-bolt",
  "fa-cubes",
  "fa-database",
  "fa-window-maximize",
  "fa-paint-brush",
  "fa-pen-ruler",
  "fa-magnifying-glass",
  "fa-gauge-high",
  "fa-screwdriver-wrench",
  "fa-fill-drip",
  "fa-wordpress",
  "fa-envelope",
  "fa-comments",
  "fa-server",
  "fa-globe",
  "fa-laptop-code",
  "fa-shield-halved",
  "fa-rocket",
  "fa-gears",
  "fa-brain",
  "fa-robot",
  "fa-headset",
];

const CURRENCIES = ["EUR", "RON", "USD"];
const INTERVALS = [
  { value: "per-project", label: "per proiect" },
  { value: "one-time", label: "one-time" },
  { value: "monthly", label: "lunar" },
  { value: "yearly", label: "anual" },
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateId(): string {
  return `svc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyFeature(): ServiceFeature {
  return { id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, label: "" };
}

function emptyPricingTier(): ServicePricingTier {
  return {
    name: "",
    price: "",
    currency: "EUR",
    interval: "per-project",
    features: [""],
    highlighted: false,
    ctaLabel: "",
    ctaHref: "#contact",
  };
}

function emptyFormData(): ServiceFormData {
  return {
    title: "",
    slug: "",
    subtitle: "",
    description: "",
    longDescription: "",
    icon: "fa-code",
    imageUrl: "",
    category: "",
    isActive: true,
    features: [emptyFeature()],
    pricing: [emptyPricingTier()],
    techStack: [],
  };
}

function serviceToFormData(svc: ServiceWithCategory): ServiceFormData {
  return {
    title: svc.title,
    slug: svc.slug,
    subtitle: svc.subtitle ?? "",
    description: svc.description,
    longDescription: svc.longDescription ?? "",
    icon: svc.icon ?? "fa-code",
    imageUrl: svc.imageUrl ?? "",
    category: svc.category ?? "",
    isActive: svc.isActive,
    features: svc.features.length > 0
      ? svc.features.map((f) => ({ ...f }))
      : [emptyFeature()],
    pricing: svc.pricing && svc.pricing.length > 0
      ? svc.pricing.map((p) => ({
          ...p,
          features: [...p.features],
          currency: p.currency ?? "EUR",
          interval: p.interval ?? "per-project",
        }))
      : [emptyPricingTier()],
    techStack: svc.techStack ? [...svc.techStack] : [],
  };
}

function formDataToService(
  form: ServiceFormData,
  existing?: ServiceWithCategory,
): ServiceWithCategory {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? generateId(),
    slug: form.slug || generateSlug(form.title) || `serviciu-${Date.now()}`,
    title: form.title.trim(),
    subtitle: form.subtitle.trim() || undefined,
    description: form.description.trim(),
    longDescription: form.longDescription.trim() || undefined,
    icon: form.icon || undefined,
    imageUrl: form.imageUrl.trim() || undefined,
    category: form.category || undefined,
    isActive: form.isActive,
    features: form.features.filter((f) => f.label.trim()),
    pricing: form.pricing
      .filter((p) => p.name.trim() && p.price.trim())
      .map((p) => ({
        ...p,
        features: p.features.filter((f) => f.trim()),
        currency: p.currency ?? "EUR",
        interval: p.interval ?? "per-project",
        ctaLabel: p.ctaLabel?.trim() || undefined,
        ctaHref: p.ctaHref?.trim() || undefined,
      })),
    techStack: form.techStack.length > 0 ? [...form.techStack] : undefined,
    order: existing?.order ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/* ─────────────────────────────────────────────────────────
   Helpers calcul preț / reducere
   ───────────────────────────────────────────────────────── */

interface PricingSummary {
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  savings: number;
  hasDiscount: boolean;
}

function computePricingSummary(
  tiers: ServicePricingTier[],
): PricingSummary | null {
  const standard = tiers.find((t) => !t.highlighted);
  const discounted = tiers.find((t) => t.highlighted);

  if (!standard || !discounted) return null;

  const original = parseFloat(standard.price);
  const reduced = parseFloat(discounted.price);

  if (isNaN(original) || isNaN(reduced) || original <= 0 || reduced >= original)
    return null;

  const savings = original - reduced;
  const discountPercent = Math.round((savings / original) * 100);

  return {
    originalPrice: original,
    discountedPrice: reduced,
    discountPercent,
    savings,
    hasDiscount: true,
  };
}

/* ═════════════════════════════════════════════════════════
   Componenta principală
   ═════════════════════════════════════════════════════════ */

export interface ServicesEditorProps {
  /** Lista curentă de servicii */
  services: readonly Service[];
  /** Callback salvare completă (înlocuiește toate serviciile) */
  onSave: (services: Service[]) => void;
  /** Callback dirty */
  onDirty: () => void;
  /** Stare salvare */
  saving: boolean;
}

export default function ServicesEditor({
  services: initialServices,
  onSave,
  onDirty,
  saving,
}: ServicesEditorProps) {
  /* ── Stare principală ── */
  const [services, setServices] = useState<ServiceWithCategory[]>(() =>
    [...initialServices]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ ...s, category: (s as ServiceWithCategory).category ?? "" })),
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormData>(emptyFormData());
  const [errors, setErrors] = useState<FormErrors>({});
  const [isNewService, setIsNewService] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | "" | "all">("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [techInput, setTechInput] = useState("");

  const formRef = useRef<HTMLDivElement>(null);

  /* ── Sincronizare date externe ── */
  useEffect(() => {
    setServices(
      [...initialServices]
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ ...s, category: (s as ServiceWithCategory).category ?? "" })),
    );
  }, [initialServices]);

  /* ── Serviciul selectat ── */
  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedId) ?? null,
    [services, selectedId],
  );

  const pricingSummary = useMemo(
    () => computePricingSummary(form.pricing),
    [form.pricing],
  );

  /* ── Servicii filtrate ── */
  const filteredServices = useMemo(() => {
    let list = services;
    if (categoryFilter && categoryFilter !== "all") {
      list = list.filter((s) => s.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q),
      );
    }
    return list;
  }, [services, categoryFilter, searchQuery]);

  /* ── Statistici ── */
  const stats = useMemo(() => {
    const active = services.filter((s) => s.isActive).length;
    const inactive = services.length - active;
    const withDiscount = services.filter((s) => {
      if (!s.pricing || s.pricing.length < 2) return false;
      const std = s.pricing.find((p) => !p.highlighted);
      const disc = s.pricing.find((p) => p.highlighted);
      return (
        std &&
        disc &&
        parseFloat(disc.price) < parseFloat(std.price)
      );
    }).length;
    return { active, inactive, withDiscount, total: services.length };
  }, [services]);

  /* ── Selectează serviciu ── */
  const selectService = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      setIsNewService(false);
      setErrors({});

      if (id) {
        const svc = services.find((s) => s.id === id);
        if (svc) {
          setForm(serviceToFormData(svc));
        }
      } else {
        setForm(emptyFormData());
      }
    },
    [services],
  );

  /* ── Serviciu nou ── */
  const startNewService = useCallback(() => {
    setSelectedId(null);
    setIsNewService(true);
    setErrors({});
    setForm(emptyFormData());
  }, []);

  /* ── Actualizare câmp formular ── */
  const update = useCallback(
    (field: string, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      onDirty();
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });

      // Auto-slug când se schimbă titlul
      if (field === "title" && typeof value === "string") {
        setForm((prev) => ({ ...prev, slug: generateSlug(value) }));
      }
    },
    [onDirty],
  );

  /* ── Features CRUD ── */
  const addFeature = useCallback(() => {
    setForm((prev) => ({ ...prev, features: [...prev.features, emptyFeature()] }));
    onDirty();
  }, [onDirty]);

  const updateFeature = useCallback(
    (idx: number, label: string) => {
      setForm((prev) => {
        const features = [...prev.features];
        features[idx] = { ...features[idx], label };
        return { ...prev, features };
      });
      onDirty();
    },
    [onDirty],
  );

  const removeFeature = useCallback(
    (idx: number) => {
      setForm((prev) => {
        if (prev.features.length <= 1) return prev;
        const features = prev.features.filter((_, i) => i !== idx);
        return { ...prev, features };
      });
      onDirty();
    },
    [onDirty],
  );

  /* ── Pricing tiers CRUD ── */
  const addPricingTier = useCallback(() => {
    setForm((prev) => ({ ...prev, pricing: [...prev.pricing, emptyPricingTier()] }));
    onDirty();
  }, [onDirty]);

  const updatePricingTier = useCallback(
    (idx: number, field: keyof ServicePricingTier, value: unknown) => {
      setForm((prev) => {
        const pricing = [...prev.pricing];
        pricing[idx] = { ...pricing[idx], [field]: value };

        // Dacă se marchează highlighted, asigură-te că doar unul e evidențiat
        if (field === "highlighted" && value === true) {
          pricing.forEach((p, i) => {
            if (i !== idx) p.highlighted = false;
          });
        }
        return { ...prev, pricing };
      });
      onDirty();
    },
    [onDirty],
  );

  const updatePricingFeature = useCallback(
    (tierIdx: number, featIdx: number, value: string) => {
      setForm((prev) => {
        const pricing = [...prev.pricing];
        const features = [...pricing[tierIdx].features];
        features[featIdx] = value;
        pricing[tierIdx] = { ...pricing[tierIdx], features };
        return { ...prev, pricing };
      });
      onDirty();
    },
    [onDirty],
  );

  const addPricingFeature = useCallback(
    (tierIdx: number) => {
      setForm((prev) => {
        const pricing = [...prev.pricing];
        pricing[tierIdx] = {
          ...pricing[tierIdx],
          features: [...pricing[tierIdx].features, ""],
        };
        return { ...prev, pricing };
      });
      onDirty();
    },
    [onDirty],
  );

  const removePricingFeature = useCallback(
    (tierIdx: number, featIdx: number) => {
      setForm((prev) => {
        const pricing = [...prev.pricing];
        const features = pricing[tierIdx].features.filter((_, i) => i !== featIdx);
        pricing[tierIdx] = { ...pricing[tierIdx], features };
        return { ...prev, pricing };
      });
      onDirty();
    },
    [onDirty],
  );

  const removePricingTier = useCallback(
    (idx: number) => {
      setForm((prev) => {
        if (prev.pricing.length <= 1) return prev;
        const pricing = prev.pricing.filter((_, i) => i !== idx);
        return { ...prev, pricing };
      });
      onDirty();
    },
    [onDirty],
  );

  /* ── Tech stack ── */
  const addTech = useCallback(() => {
    const val = techInput.trim();
    if (!val) return;
    setForm((prev) => ({
      ...prev,
      techStack: [...prev.techStack, val],
    }));
    setTechInput("");
    onDirty();
  }, [techInput, onDirty]);

  const removeTech = useCallback(
    (idx: number) => {
      setForm((prev) => ({
        ...prev,
        techStack: prev.techStack.filter((_, i) => i !== idx),
      }));
      onDirty();
    },
    [onDirty],
  );

  /* ── Validare ── */
  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};

    if (!form.title.trim()) errs.title = "Titlul este obligatoriu.";
    else if (form.title.trim().length < 3)
      errs.title = "Titlul trebuie să aibă cel puțin 3 caractere.";

    if (!form.slug.trim()) errs.slug = "Slug-ul este obligatoriu.";
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim()))
      errs.slug = "Slug invalid. Folosește doar litere mici, cifre și cratime.";

    if (!form.description.trim()) errs.description = "Descrierea este obligatorie.";
    else if (form.description.trim().length < 10)
      errs.description = "Descrierea trebuie să aibă cel puțin 10 caractere.";

    if (form.features.filter((f) => f.label.trim()).length === 0)
      errs.features = "Adaugă cel puțin o caracteristică.";

    // Validare pricing tiers
    form.pricing.forEach((p, i) => {
      if (p.name.trim() && !p.price.trim()) {
        errs[`pricing-${i}-price`] = "Prețul este obligatoriu.";
      }
      if (!p.name.trim() && p.price.trim()) {
        errs[`pricing-${i}-name`] = "Numele pachetului este obligatoriu.";
      }
      if (p.price.trim() && isNaN(parseFloat(p.price))) {
        errs[`pricing-${i}-price`] = "Prețul trebuie să fie un număr.";
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  /* ── Salvare serviciu curent ── */
  const saveCurrent = useCallback(() => {
    if (!validate()) return;

    const saved = formDataToService(form, selectedService ?? undefined);

    setServices((prev) => {
      if (isNewService || !selectedId) {
        // Adaugă la final
        saved.order = prev.length > 0 ? Math.max(...prev.map((s) => s.order)) + 1 : 1;
        return [...prev, saved];
      }
      // Actualizează
      return prev.map((s) => (s.id === selectedId ? { ...s, ...saved, id: s.id } : s));
    });

    setSelectedId(saved.id);
    setIsNewService(false);
    setErrors({});
  }, [form, validate, selectedService, selectedId, isNewService]);

  /* ── Ștergere serviciu ── */
  const deleteService = useCallback(
    (id: string) => {
      setServices((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setIsNewService(false);
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
      setServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)),
      );
      onDirty();

      // Actualizează și formularul dacă e selectat
      if (id === selectedId) {
        setForm((prev) => ({ ...prev, isActive: !prev.isActive }));
      }
    },
    [selectedId, onDirty],
  );

  /* ── Mută în sus/jos ── */
  const moveService = useCallback(
    (id: string, direction: "up" | "down") => {
      setServices((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        if (idx === -1) return prev;
        const target = direction === "up" ? idx - 1 : idx + 1;
        if (target < 0 || target >= prev.length) return prev;

        const next = [...prev];
        // Swap order values
        const tmp = next[idx].order;
        next[idx] = { ...next[idx], order: next[target].order };
        next[target] = { ...next[target], order: tmp };

        // Swap positions
        [next[idx], next[target]] = [next[target], next[idx]];

        return next;
      });
      onDirty();
    },
    [onDirty],
  );

  /* ── Submit final (salvează toată lista) ── */
  const handleSaveAll = useCallback(() => {
    // Re-atribuie order pe baza poziției din array
    const ordered = services.map((s, i) => ({ ...s, order: i + 1 }));
    // Strip category before saving (e local field)
    const cleaned = ordered.map(({ category, ...rest }) => rest as Service);
    onSave(cleaned);
  }, [services, onSave]);

  /* ── Keyboard shortcuts ── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (selectedId || isNewService) {
          saveCurrent();
        } else {
          handleSaveAll();
        }
      }
    },
    [selectedId, isNewService, saveCurrent, handleSaveAll],
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
          LISTA DE SERVICII – Stânga
          ═════════════════════════════════════════ */}
      <div className="w-full xl:w-[380px] flex-shrink-0">
        <div className="sticky top-24 space-y-4">
          {/* Header cu statistici */}
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-briefcase text-[10px] text-nexus-glow/60" />
              Servicii
              <span className="text-white/25 font-mono text-[10px]">
                {stats.total}
              </span>
            </h3>
            <button
              type="button"
              onClick={startNewService}
              className="flex items-center gap-1.5 text-[11px] font-medium text-nexus-glow bg-nexus-accent/15 hover:bg-nexus-accent/25 border border-nexus-accent/25 hover:border-nexus-accent/40 rounded-full px-3 py-1.5 transition-all duration-200"
            >
              <i className="fa-solid fa-plus text-[9px]" />
              Adaugă
            </button>
          </div>

          {/* Statistici rapide */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-glass-border bg-white/[0.02] p-3 text-center">
              <p className="text-lg font-bold text-white">{stats.active}</p>
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
                Cu reducere
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
                placeholder="Caută serviciu..."
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

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`text-[10px] font-medium rounded-full px-2.5 py-1 transition-all duration-200 ${
                  categoryFilter === "all"
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-white/35 border border-transparent hover:text-white/60"
                }`}
              >
                Toate
              </button>
              {CATEGORIES.filter((c) => c.value !== "").map((cat) => {
                const count = services.filter((s) => s.category === cat.value).length;
                if (count === 0) return null;
                return (
                  <button
                    key={cat.value}
                    onClick={() =>
                      setCategoryFilter(
                        categoryFilter === cat.value ? "all" : cat.value,
                      )
                    }
                    className={`text-[10px] font-medium rounded-full px-2.5 py-1 transition-all duration-200 flex items-center gap-1 ${
                      categoryFilter === cat.value
                        ? `${CATEGORY_COLORS[cat.value as ServiceCategory]}`
                        : "text-white/35 border border-transparent hover:text-white/60"
                    }`}
                  >
                    <i className={`fa-solid ${cat.icon} text-[8px]`} />
                    {cat.label}
                    <span className="text-[9px] opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista servicii */}
          <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-thin">
            <AnimatePresence initial={false}>
              {filteredServices.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <i className="fa-solid fa-folder-open text-2xl text-white/10 block mb-2" />
                  <p className="text-xs text-white/25">
                    {searchQuery || categoryFilter !== "all"
                      ? "Niciun serviciu nu se potrivește filtrelor."
                      : "Niciun serviciu adăugat."}
                  </p>
                </motion.div>
              ) : (
                filteredServices.map((svc, idx) => {
                  const isSelected = selectedId === svc.id;
                  const svcPricingSummary = computePricingSummary(
                    (svc.pricing as ServicePricingTier[]) ?? [],
                  );
                  const catInfo = CATEGORIES.find((c) => c.value === svc.category);

                  return (
                    <motion.div
                      key={svc.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={() => selectService(svc.id)}
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
                          <i className={`fa-solid ${svc.icon || "fa-code"}`} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium truncate ${
                                isSelected ? "text-white" : "text-white/70"
                              }`}
                            >
                              {svc.title}
                            </span>
                            {!svc.isActive && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400/70 border border-red-400/15 flex-shrink-0">
                                inactiv
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {catInfo && (
                              <span className="text-[9px] text-white/20 flex items-center gap-1">
                                <i className={`fa-solid ${catInfo.icon} text-[7px]`} />
                                {catInfo.label}
                              </span>
                            )}
                            {svcPricingSummary?.hasDiscount && (
                              <span className="text-[9px] font-medium text-gold/80 bg-gold/10 rounded-full px-1.5 py-0.5">
                                -{svcPricingSummary.discountPercent}%
                              </span>
                            )}
                            {svc.pricing && svc.pricing.length > 0 && (
                              <span className="text-[9px] text-white/25 font-mono">
                                de la {parseFloat(svc.pricing[0].price).toLocaleString("ro-RO")}{" "}
                                {svc.pricing[0].currency ?? "EUR"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Acțiuni rapide */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveService(svc.id, "up");
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
                              moveService(svc.id, "down");
                            }}
                            disabled={idx === filteredServices.length - 1}
                            className="p-1 rounded text-white/20 hover:text-white/60 disabled:opacity-20"
                            title="Mută în jos"
                          >
                            <i className="fa-solid fa-chevron-down text-[10px]" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleActive(svc.id);
                            }}
                            className={`p-1 rounded transition-colors ${
                              svc.isActive
                                ? "text-emerald-400/60 hover:text-emerald-400"
                                : "text-white/15 hover:text-amber-400/70"
                            }`}
                            title={svc.isActive ? "Dezactivează" : "Activează"}
                          >
                            <i
                              className={`fa-solid ${svc.isActive ? "fa-eye" : "fa-eye-slash"} text-[10px]`}
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
        {!selectedId && !isNewService ? (
          /* Stare goală */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-glass-border flex items-center justify-center mb-5">
              <i className="fa-solid fa-briefcase text-2xl text-white/15" />
            </div>
            <h3 className="text-lg font-heading font-bold text-white/40 mb-2">
              Editor Servicii
            </h3>
            <p className="text-sm text-white/25 max-w-md leading-relaxed mb-6">
              Selectează un serviciu din listă pentru a-l edita sau creează unul
              nou.
            </p>
            <button
              type="button"
              onClick={startNewService}
              className="glass-btn text-sm px-6 py-2.5"
            >
              <i className="fa-solid fa-plus text-xs" />
              <span>Serviciu nou</span>
            </button>
            {services.length === 0 && (
              <p className="text-[10px] text-white/15 mt-4 font-mono">
                Nu există servicii configurate.
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
                    {isNewService ? "Serviciu nou" : "Editare serviciu"}
                  </h3>
                  {Object.keys(errors).length > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-red-400/80 bg-red-500/10 border border-red-400/20 rounded-full px-2.5 py-0.5">
                      <i className="fa-solid fa-triangle-exclamation text-[9px]" />
                      {Object.keys(errors).length} erori
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isNewService && selectedId && (
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
                    {isNewService ? "Adaugă în listă" : "Actualizează"}
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
                        Ești sigur că vrei să ștergi acest serviciu? Acțiunea
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
                          onClick={() => deleteService(showDeleteConfirm)}
                          className="text-xs font-medium text-red-400 bg-red-500/15 border border-red-400/25 rounded-lg px-4 py-1.5"
                        >
                          Șterge definitiv
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Secțiunea: Informații de bază ── */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-circle-info text-[10px] text-nexus-glow/60" />
                  Informații de bază
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Titlu"
                    field="svc-title"
                    error={errors.title}
                    required
                  >
                    <input
                      id="svc-title"
                      type="text"
                      value={form.title}
                      onChange={(e) => update("title", e.target.value)}
                      placeholder="Web Development Full-Stack"
                      className={inputClass("title")}
                      aria-required="true"
                      aria-invalid={!!errors.title}
                    />
                  </Field>

                  <Field
                    label="Slug"
                    field="svc-slug"
                    error={errors.slug}
                    required
                  >
                    <div className="relative">
                      <input
                        id="svc-slug"
                        type="text"
                        value={form.slug}
                        onChange={(e) => update("slug", e.target.value)}
                        placeholder="web-development-full-stack"
                        className={`${inputClass("slug")} font-mono text-xs`}
                        aria-required="true"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          update("slug", generateSlug(form.title))
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/20 hover:text-white/50 p-1"
                        title="Generează din titlu"
                      >
                        <i className="fa-solid fa-rotate" />
                      </button>
                    </div>
                  </Field>
                </div>

                <Field label="Subtitlu (opțional)" field="svc-subtitle">
                  <input
                    id="svc-subtitle"
                    type="text"
                    value={form.subtitle}
                    onChange={(e) => update("subtitle", e.target.value)}
                    placeholder="Subtitlu scurt pentru card"
                    className={inputClass("subtitle")}
                  />
                </Field>

                <Field
                  label="Descriere scurtă"
                  field="svc-desc"
                  error={errors.description}
                  required
                >
                  <textarea
                    id="svc-desc"
                    rows={3}
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Descrierea serviciului (afișată în card)..."
                    className={inputClass("description")}
                    aria-required="true"
                  />
                  <CharCount current={form.description.length} max={300} />
                </Field>

                <Field label="Descriere lungă (opțional)" field="svc-longdesc">
                  <textarea
                    id="svc-longdesc"
                    rows={4}
                    value={form.longDescription}
                    onChange={(e) => update("longDescription", e.target.value)}
                    placeholder="Descriere detaliată (afișată în pagina de serviciu)..."
                    className={inputClass("longDescription")}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Icon selector */}
                  <Field label="Iconiță" field="svc-icon">
                    <div className="relative">
                      <select
                        id="svc-icon"
                        value={form.icon}
                        onChange={(e) => update("icon", e.target.value)}
                        className={`${inputClass("icon")} appearance-none pr-10`}
                      >
                        {AVAILABLE_ICONS.map((ic) => (
                          <option key={ic} value={ic}>
                            {ic.replace("fa-", "")}
                          </option>
                        ))}
                      </select>
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                        <i className={`fa-solid ${form.icon} text-sm`} />
                      </span>
                    </div>
                  </Field>

                  {/* Categorie */}
                  <Field label="Categorie" field="svc-category">
                    <select
                      id="svc-category"
                      value={form.category}
                      onChange={(e) =>
                        update(
                          "category",
                          e.target.value as ServiceCategory | "",
                        )
                      }
                      className={`${inputClass("category")} appearance-none`}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {/* Activ/Inactiv */}
                  <Field label="Stare" field="svc-active">
                    <ToggleField
                      label={form.isActive ? "Activ" : "Inactiv"}
                      checked={form.isActive}
                      onChange={(v) => update("isActive", v)}
                    />
                  </Field>
                </div>

                <Field label="URL imagine (opțional)" field="svc-image">
                  <input
                    id="svc-image"
                    type="text"
                    value={form.imageUrl}
                    onChange={(e) => update("imageUrl", e.target.value)}
                    placeholder="/images/services/web-dev.jpg"
                    className={inputClass("imageUrl")}
                  />
                </Field>
              </fieldset>

              {/* ── Secțiunea: Caracteristici ── */}
              <fieldset className="space-y-3">
                <div className="flex items-center justify-between">
                  <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-[10px] text-nexus-glow/60" />
                    Caracteristici
                  </legend>
                  <button
                    type="button"
                    onClick={addFeature}
                    className="text-[10px] text-nexus-glow/70 hover:text-nexus-glow flex items-center gap-1"
                  >
                    <i className="fa-solid fa-plus text-[8px]" />
                    Adaugă
                  </button>
                </div>
                {errors.features && (
                  <p className="text-xs text-red-400/80 flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-exclamation text-[10px]" />
                    {errors.features}
                  </p>
                )}
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {form.features.map((feat, idx) => (
                      <motion.div
                        key={feat.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2"
                      >
                        <span className="text-[10px] text-white/15 font-mono w-5">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={feat.label}
                          onChange={(e) => updateFeature(idx, e.target.value)}
                          placeholder={`Caracteristica ${idx + 1}`}
                          className={inputClass(`feature-${idx}`)}
                        />
                        <button
                          type="button"
                          onClick={() => removeFeature(idx)}
                          disabled={form.features.length <= 1}
                          className="p-2 text-white/15 hover:text-red-400/60 disabled:opacity-20 transition-colors"
                        >
                          <i className="fa-solid fa-xmark text-xs" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </fieldset>

              {/* ── Secțiunea: Pachete de prețuri ── */}
              <fieldset className="space-y-4">
                <div className="flex items-center justify-between">
                  <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-tags text-[10px] text-nexus-glow/60" />
                    Pachete & Prețuri
                  </legend>
                  <button
                    type="button"
                    onClick={addPricingTier}
                    className="text-[10px] text-nexus-glow/70 hover:text-nexus-glow flex items-center gap-1"
                  >
                    <i className="fa-solid fa-plus text-[8px]" />
                    Adaugă pachet
                  </button>
                </div>

                {/* Pricing summary banner */}
                {pricingSummary?.hasDiscount && (
                  <div className="rounded-xl border border-gold/20 bg-gold/[0.04] p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/25 flex items-center justify-center flex-shrink-0">
                        <i className="fa-solid fa-percent text-gold text-sm" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gold/90">
                          Reducere activă:{" "}
                          <span className="font-bold">
                            -{pricingSummary.discountPercent}%
                          </span>
                        </p>
                        <p className="text-[11px] text-white/45 mt-0.5">
                          Economie de{" "}
                          {pricingSummary.savings.toLocaleString("ro-RO")}{" "}
                          {form.pricing.find((p) => p.highlighted)?.currency ?? "EUR"}{" "}
                          față de prețul standard (
                          {pricingSummary.originalPrice.toLocaleString("ro-RO")}{" "}
                          →{" "}
                          {pricingSummary.discountedPrice.toLocaleString("ro-RO")})
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <AnimatePresence initial={false}>
                    {form.pricing.map((tier, tierIdx) => (
                      <motion.div
                        key={tierIdx}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className={`rounded-xl border p-5 space-y-4 transition-all duration-200 ${
                          tier.highlighted
                            ? "border-gold/30 bg-gold/[0.03]"
                            : "border-glass-border bg-white/[0.01]"
                        }`}
                      >
                        {/* Header pachet */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-[10px] font-mono text-white/20">
                              #{tierIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={tier.name}
                              onChange={(e) =>
                                updatePricingTier(tierIdx, "name", e.target.value)
                              }
                              placeholder="Nume pachet (ex: Standard)"
                              className={`${inputClass(`pricing-${tierIdx}-name`)} max-w-[200px] font-medium`}
                            />
                            {tier.highlighted && (
                              <span className="text-[10px] font-medium text-gold/70 bg-gold/10 border border-gold/20 rounded-full px-2 py-0.5 flex-shrink-0">
                                Redus
                              </span>
                            )}
                          </div>

                          {/* Acțiuni pachet */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updatePricingTier(
                                  tierIdx,
                                  "highlighted",
                                  !tier.highlighted,
                                )
                              }
                              className={`p-1.5 rounded-lg text-xs transition-colors ${
                                tier.highlighted
                                  ? "text-gold bg-gold/10"
                                  : "text-white/20 hover:text-white/50"
                              }`}
                              title="Marchează ca pachet redus"
                            >
                              <i
                                className={`fa-solid ${tier.highlighted ? "fa-star" : "fa-star"} text-[10px]`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => removePricingTier(tierIdx)}
                              disabled={form.pricing.length <= 1}
                              className="p-1.5 rounded-lg text-white/15 hover:text-red-400/60 disabled:opacity-20 transition-colors"
                            >
                              <i className="fa-solid fa-trash-can text-[10px]" />
                            </button>
                          </div>
                        </div>

                        {/* Preț, monedă, interval */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Field
                            label="Preț"
                            field={`pricing-${tierIdx}-price`}
                            error={errors[`pricing-${tierIdx}-price`]}
                          >
                            <div className="relative">
                              <input
                                id={`pricing-${tierIdx}-price`}
                                type="text"
                                value={tier.price}
                                onChange={(e) =>
                                  updatePricingTier(
                                    tierIdx,
                                    "price",
                                    e.target.value,
                                  )
                                }
                                placeholder="2499"
                                className={inputClass(`pricing-${tierIdx}-price`)}
                              />
                            </div>
                          </Field>

                          <Field label="Monedă" field={`pricing-${tierIdx}-currency`}>
                            <select
                              id={`pricing-${tierIdx}-currency`}
                              value={tier.currency ?? "EUR"}
                              onChange={(e) =>
                                updatePricingTier(
                                  tierIdx,
                                  "currency",
                                  e.target.value,
                                )
                              }
                              className={inputClass(`pricing-${tierIdx}-currency`)}
                            >
                              {CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </Field>

                          <Field
                            label="Interval"
                            field={`pricing-${tierIdx}-interval`}
                          >
                            <select
                              id={`pricing-${tierIdx}-interval`}
                              value={tier.interval ?? "per-project"}
                              onChange={(e) =>
                                updatePricingTier(
                                  tierIdx,
                                  "interval",
                                  e.target.value,
                                )
                              }
                              className={inputClass(`pricing-${tierIdx}-interval`)}
                            >
                              {INTERVALS.map((inv) => (
                                <option key={inv.value} value={inv.value}>
                                  {inv.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>

                        {/* CTA */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field
                            label="Text buton CTA (opțional)"
                            field={`pricing-${tierIdx}-cta`}
                          >
                            <input
                              id={`pricing-${tierIdx}-cta-label`}
                              type="text"
                              value={tier.ctaLabel ?? ""}
                              onChange={(e) =>
                                updatePricingTier(
                                  tierIdx,
                                  "ctaLabel",
                                  e.target.value,
                                )
                              }
                              placeholder="Alege pachetul"
                              className={inputClass(`pricing-${tierIdx}-cta`)}
                            />
                          </Field>
                          <Field
                            label="Link CTA (opțional)"
                            field={`pricing-${tierIdx}-ctaHref`}
                          >
                            <input
                              id={`pricing-${tierIdx}-ctaHref`}
                              type="text"
                              value={tier.ctaHref ?? ""}
                              onChange={(e) =>
                                updatePricingTier(
                                  tierIdx,
                                  "ctaHref",
                                  e.target.value,
                                )
                              }
                              placeholder="#contact"
                              className={inputClass(`pricing-${tierIdx}-ctaHref`)}
                            />
                          </Field>
                        </div>

                        {/* Features în pachet */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">
                              Caracteristici incluse
                            </span>
                            <button
                              type="button"
                              onClick={() => addPricingFeature(tierIdx)}
                              className="text-[10px] text-white/25 hover:text-white/50"
                            >
                              <i className="fa-solid fa-plus text-[8px]" /> Adaugă
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {tier.features.map((feat, featIdx) => (
                              <div
                                key={featIdx}
                                className="flex items-center gap-2"
                              >
                                <i className="fa-solid fa-circle-check text-[8px] text-emerald-400/40 flex-shrink-0" />
                                <input
                                  type="text"
                                  value={feat}
                                  onChange={(e) =>
                                    updatePricingFeature(
                                      tierIdx,
                                      featIdx,
                                      e.target.value,
                                    )
                                  }
                                  placeholder={`Inclus în pachet ${tierIdx + 1}`}
                                  className={`${inputClass(`pricing-${tierIdx}-feat-${featIdx}`)} text-xs py-1.5`}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    removePricingFeature(tierIdx, featIdx)
                                  }
                                  className="p-1 text-white/10 hover:text-red-400/50 transition-colors"
                                >
                                  <i className="fa-solid fa-xmark text-[9px]" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </fieldset>

              {/* ── Secțiunea: Tech Stack ── */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-microchip text-[10px] text-nexus-glow/60" />
                  Tech Stack (opțional)
                </legend>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTech();
                      }
                    }}
                    placeholder="Adaugă tehnologie (ex: React, Node.js)..."
                    className={inputClass("techStack")}
                  />
                  <button
                    type="button"
                    onClick={addTech}
                    className="p-2.5 rounded-xl bg-white/[0.04] border border-glass-border text-white/40 hover:text-white/70 hover:border-glass-border-strong transition-all"
                  >
                    <i className="fa-solid fa-plus text-xs" />
                  </button>
                </div>

                {form.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence initial={false}>
                      {form.techStack.map((tech, idx) => (
                        <motion.span
                          key={`${tech}-${idx}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="inline-flex items-center gap-1.5 text-[11px] text-white/60 bg-white/[0.05] border border-white/[0.08] rounded-full pl-3 pr-1.5 py-1"
                        >
                          {tech}
                          <button
                            type="button"
                            onClick={() => removeTech(idx)}
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

              {/* ── Preview card serviciu ── */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-eye text-[10px] text-nexus-glow/60" />
                  Previzualizare card
                </legend>

                <div className="rounded-glass-lg border border-glass-border bg-white/[0.01] p-6 max-w-md">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-nexus-accent/20 border border-nexus-accent/25 flex items-center justify-center flex-shrink-0">
                      <i
                        className={`fa-solid ${form.icon || "fa-code"} text-lg text-nexus-glow`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-white font-heading font-bold text-base">
                          {form.title.trim() || "Titlu serviciu"}
                        </h4>
                        {form.category && (
                          <span
                            className={`text-[9px] font-medium rounded-full px-2 py-0.5 border ${
                              CATEGORY_COLORS[
                                form.category as ServiceCategory
                              ] ?? ""
                            }`}
                          >
                            {
                              CATEGORIES.find((c) => c.value === form.category)
                                ?.label
                            }
                          </span>
                        )}
                      </div>
                      {form.subtitle.trim() && (
                        <p className="text-xs text-white/40 mt-0.5">
                          {form.subtitle}
                        </p>
                      )}
                      <p className="text-xs text-white/45 mt-2 leading-relaxed line-clamp-2">
                        {form.description.trim() || "Descrierea serviciului..."}
                      </p>

                      {/* Features preview */}
                      {form.features.filter((f) => f.label.trim()).length >
                        0 && (
                        <div className="mt-3 space-y-1">
                          {form.features
                            .filter((f) => f.label.trim())
                            .slice(0, 4)
                            .map((f, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 text-[11px] text-white/45"
                              >
                                <i className="fa-solid fa-circle-check text-[8px] text-emerald-400/50 flex-shrink-0" />
                                {f.label}
                              </div>
                            ))}
                          {form.features.filter((f) => f.label.trim()).length >
                            4 && (
                            <p className="text-[10px] text-white/20 ml-4">
                              +
                              {form.features.filter((f) => f.label.trim())
                                .length - 4}{" "}
                              altele
                            </p>
                          )}
                        </div>
                      )}

                      {/* Pricing preview */}
                      {form.pricing.filter((p) => p.name.trim() && p.price.trim())
                        .length > 0 && (
                        <div className="mt-3 flex items-center gap-3">
                          {form.pricing
                            .filter((p) => p.name.trim() && p.price.trim())
                            .slice(0, 2)
                            .map((p, i) => (
                              <div
                                key={i}
                                className={`text-xs ${
                                  p.highlighted
                                    ? "text-gold font-bold"
                                    : "text-white/50"
                                }`}
                              >
                                {p.highlighted && (
                                  <span className="text-[9px] line-through text-white/20 mr-1">
                                    {(() => {
                                      const std = form.pricing.find(
                                        (t) => !t.highlighted,
                                      );
                                      return std
                                        ? `${std.price} ${std.currency}`
                                        : "";
                                    })()}
                                  </span>
                                )}
                                {parseFloat(p.price).toLocaleString("ro-RO")}{" "}
                                {p.currency}
                                <span className="text-[10px] text-white/25 ml-0.5">
                                  /{INTERVALS.find((inv) => inv.value === p.interval)?.label ?? p.interval}
                                </span>
                              </div>
                            ))}
                        </div>
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
                  isNewService ||
                  (selectedService !== null &&
                    JSON.stringify(formDataToService(form)) !==
                      JSON.stringify(selectedService))
                }
                serviceCount={services.length}
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
  serviceCount,
  onSaveAll,
}: {
  saving: boolean;
  hasErrors: boolean;
  hasChanges: boolean;
  serviceCount: number;
  onSaveAll: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-glass-border">
      <button
        type="button"
        onClick={onSaveAll}
        disabled={saving || hasErrors || serviceCount === 0}
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
              Salvează toate serviciile ({serviceCount})
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
          <span className="w-2 h-2 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.5)] flex-shrink-0" title="Modificări nesalvate" />
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   Exporturi denumite
   ═════════════════════════════════════════════════════════ */

export type {
  ServiceWithCategory,
  ServiceFormData,
  ServiceCategory,
  FormErrors,
  PricingSummary,
};
export { CATEGORIES, CATEGORY_COLORS, AVAILABLE_ICONS, generateSlug };