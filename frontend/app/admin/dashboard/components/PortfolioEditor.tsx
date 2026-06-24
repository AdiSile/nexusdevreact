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
  PortfolioItem,
  PortfolioMediaItem,
  PortfolioTestimonial,
} from "../../../../lib/types";

/* ═══════════════════════════════════════════════════════════════════════════
   PortfolioEditor – CRUD complet pentru proiecte portofoliu
   Suportă: listare, adăugare, editare, ștergere, reordonare,
   imagini/video media, testimonial, link-uri, categorii, featured.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────
   Tipuri locale
   ───────────────────────────────────────────────────────── */

interface PortfolioFormData {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  challenge: string;
  solution: string;
  results: string[];
  category: string;
  tags: string[];
  media: PortfolioMediaItem[];
  thumbnailUrl: string;
  liveUrl: string;
  repoUrl: string;
  testimonial: PortfolioTestimonial | null;
  serviceIds: string[];
  clientName: string;
  completionDate: string;
  isFeatured: boolean;
  isActive: boolean;
}

interface FormErrors {
  [field: string]: string;
}

/* Constante categorii portofoliu */
const PORTFOLIO_CATEGORIES = [
  "Web",
  "Mobile",
  "Branding",
  "E-Commerce",
  "Enterprise",
  "Education",
  "Healthcare",
  "SaaS",
  "Fintech",
  "Design",
  "Marketing",
  "AI/ML",
  "Gaming",
  "Social",
  "IoT",
];

const CATEGORY_COLORS: Record<string, string> = {
  Web: "bg-blue-500/20 text-blue-400 border-blue-400/30",
  Mobile: "bg-orange-500/20 text-orange-400 border-orange-400/30",
  Branding: "bg-purple-500/20 text-purple-400 border-purple-400/30",
  "E-Commerce": "bg-emerald-500/20 text-emerald-400 border-emerald-400/30",
  Enterprise: "bg-cyan-500/20 text-cyan-400 border-cyan-400/30",
  Education: "bg-amber-500/20 text-amber-400 border-amber-400/30",
  Healthcare: "bg-red-500/20 text-red-400 border-red-400/30",
  SaaS: "bg-violet-500/20 text-violet-400 border-violet-400/30",
  Fintech: "bg-green-500/20 text-green-400 border-green-400/30",
  Design: "bg-pink-500/20 text-pink-400 border-pink-400/30",
  Marketing: "bg-rose-500/20 text-rose-400 border-rose-400/30",
  "AI/ML": "bg-indigo-500/20 text-indigo-400 border-indigo-400/30",
  Gaming: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-400/30",
  Social: "bg-sky-500/20 text-sky-400 border-sky-400/30",
  IoT: "bg-teal-500/20 text-teal-400 border-teal-400/30",
};

const DEFAULT_CATEGORY_COLOR =
  "bg-white/10 text-white/50 border-white/15";

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? DEFAULT_CATEGORY_COLOR;
}

/* ─────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────── */

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateId(): string {
  return `port-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyMediaItem(type: "image" | "video" = "image"): PortfolioMediaItem {
  return {
    type,
    url: "",
    alt: "",
    poster: type === "video" ? "" : undefined,
  };
}

function emptyFormData(): PortfolioFormData {
  return {
    title: "",
    slug: "",
    subtitle: "",
    description: "",
    challenge: "",
    solution: "",
    results: [""],
    category: "",
    tags: [],
    media: [emptyMediaItem("image")],
    thumbnailUrl: "",
    liveUrl: "",
    repoUrl: "",
    testimonial: null,
    serviceIds: [],
    clientName: "",
    completionDate: "",
    isFeatured: false,
    isActive: true,
  };
}

function portfolioToFormData(item: PortfolioItem): PortfolioFormData {
  return {
    title: item.title,
    slug: item.slug,
    subtitle: item.subtitle ?? "",
    description: item.description,
    challenge: item.challenge ?? "",
    solution: item.solution ?? "",
    results:
      item.results && item.results.length > 0 ? [...item.results] : [""],
    category: item.category,
    tags: [...item.tags],
    media:
      item.media.length > 0
        ? item.media.map((m) => ({ ...m, poster: m.poster ?? undefined }))
        : [emptyMediaItem("image")],
    thumbnailUrl: item.thumbnailUrl ?? "",
    liveUrl: item.liveUrl ?? "",
    repoUrl: item.repoUrl ?? "",
    testimonial: item.testimonial
      ? { ...item.testimonial }
      : null,
    serviceIds: item.serviceIds ? [...item.serviceIds] : [],
    clientName: item.clientName ?? "",
    completionDate: item.completionDate ?? "",
    isFeatured: item.isFeatured,
    isActive: item.isActive,
  };
}

function formDataToPortfolio(
  form: PortfolioFormData,
  existing?: PortfolioItem,
): PortfolioItem {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? generateId(),
    slug: form.slug || generateSlug(form.title) || `proiect-${Date.now()}`,
    title: form.title.trim(),
    subtitle: form.subtitle.trim() || undefined,
    description: form.description.trim(),
    challenge: form.challenge.trim() || undefined,
    solution: form.solution.trim() || undefined,
    results:
      form.results.filter((r) => r.trim()).length > 0
        ? form.results.filter((r) => r.trim())
        : undefined,
    category: form.category.trim() || "Web",
    tags: form.tags.length > 0 ? [...form.tags] : [],
    media: form.media.filter((m) => m.url.trim()),
    thumbnailUrl: form.thumbnailUrl.trim() || undefined,
    liveUrl: form.liveUrl.trim() || undefined,
    repoUrl: form.repoUrl.trim() || undefined,
    testimonial: form.testimonial?.quote?.trim()
      ? (form.testimonial as PortfolioTestimonial)
      : undefined,
    serviceIds:
      form.serviceIds.length > 0 ? [...form.serviceIds] : [],
    clientName: form.clientName.trim() || undefined,
    completionDate: form.completionDate.trim() || undefined,
    order: existing?.order ?? 0,
    isFeatured: form.isFeatured,
    isActive: form.isActive,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/* ═════════════════════════════════════════════════════════
   Componenta principală
   ═════════════════════════════════════════════════════════ */

export interface PortfolioEditorProps {
  /** Lista curentă de proiecte */
  portfolio: readonly PortfolioItem[];
  /** Callback salvare completă */
  onSave: (portfolio: PortfolioItem[]) => void;
  /** Callback dirty */
  onDirty: () => void;
  /** Stare salvare */
  saving: boolean;
}

export default function PortfolioEditor({
  portfolio: initialPortfolio,
  onSave,
  onDirty,
  saving,
}: PortfolioEditorProps) {
  /* ── Stare principală ── */
  const [items, setItems] = useState<PortfolioItem[]>(() =>
    [...initialPortfolio].sort((a, b) => a.order - b.order),
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<PortfolioFormData>(emptyFormData());
  const [errors, setErrors] = useState<FormErrors>({});
  const [isNew, setIsNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [tagInput, setTagInput] = useState("");
  const [resultInput, setResultInput] = useState("");

  const formRef = useRef<HTMLDivElement>(null);

  /* ── Sincronizare date externe ── */
  useEffect(() => {
    setItems([...initialPortfolio].sort((a, b) => a.order - b.order));
  }, [initialPortfolio]);

  /* ── Proiect selectat ── */
  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  /* ── Categorii derivate din date ── */
  const derivedCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const cat = item.category || "Web";
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  /* ── Items filtrate ── */
  const filteredItems = useMemo(() => {
    let list = items;
    if (categoryFilter !== "all") {
      list = list.filter((i) => i.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.slug.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [items, categoryFilter, searchQuery]);

  /* ── Statistici ── */
  const stats = useMemo(() => {
    const active = items.filter((i) => i.isActive).length;
    const featured = items.filter((i) => i.isFeatured).length;
    const withLinks = items.filter((i) => i.liveUrl || i.repoUrl).length;
    return { active, inactive: items.length - active, featured, withLinks, total: items.length };
  }, [items]);

  /* ── Selectează proiect ── */
  const selectItem = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      setIsNew(false);
      setErrors({});

      if (id) {
        const item = items.find((i) => i.id === id);
        if (item) setForm(portfolioToFormData(item));
      } else {
        setForm(emptyFormData());
      }
    },
    [items],
  );

  /* ── Proiect nou ── */
  const startNew = useCallback(() => {
    setSelectedId(null);
    setIsNew(true);
    setErrors({});
    setForm(emptyFormData());
  }, []);

  /* ── Update câmp ── */
  const update = useCallback(
    (field: string, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      onDirty();
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      if (field === "title" && typeof value === "string") {
        setForm((prev) => ({ ...prev, slug: generateSlug(value) }));
      }
    },
    [onDirty],
  );

  /* ── Media CRUD ── */
  const addMedia = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      media: [...prev.media, emptyMediaItem("image")],
    }));
    onDirty();
  }, [onDirty]);

  const updateMedia = useCallback(
    (idx: number, field: keyof PortfolioMediaItem, value: string) => {
      setForm((prev) => {
        const media = [...prev.media];
        media[idx] = { ...media[idx], [field]: value };
        return { ...prev, media };
      });
      onDirty();
    },
    [onDirty],
  );

  const removeMedia = useCallback(
    (idx: number) => {
      setForm((prev) => {
        if (prev.media.length <= 1) return prev;
        return { ...prev, media: prev.media.filter((_, i) => i !== idx) };
      });
      onDirty();
    },
    [onDirty],
  );

  /* ── Tags CRUD ── */
  const addTag = useCallback(() => {
    const val = tagInput.trim();
    if (!val) return;
    if (form.tags.includes(val)) {
      setTagInput("");
      return;
    }
    setForm((prev) => ({ ...prev, tags: [...prev.tags, val] }));
    setTagInput("");
    onDirty();
  }, [tagInput, form.tags, onDirty]);

  const removeTag = useCallback(
    (idx: number) => {
      setForm((prev) => ({
        ...prev,
        tags: prev.tags.filter((_, i) => i !== idx),
      }));
      onDirty();
    },
    [onDirty],
  );

  /* ── Results CRUD ── */
  const addResult = useCallback(() => {
    const val = resultInput.trim();
    if (!val) return;
    setForm((prev) => ({ ...prev, results: [...prev.results, val] }));
    setResultInput("");
    onDirty();
  }, [resultInput, onDirty]);

  const updateResult = useCallback(
    (idx: number, value: string) => {
      setForm((prev) => {
        const results = [...prev.results];
        results[idx] = value;
        return { ...prev, results };
      });
      onDirty();
    },
    [onDirty],
  );

  const removeResult = useCallback(
    (idx: number) => {
      setForm((prev) => ({
        ...prev,
        results: prev.results.filter((_, i) => i !== idx),
      }));
      onDirty();
    },
    [onDirty],
  );

  /* ── Testimonial ── */
  const toggleTestimonial = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      testimonial: prev.testimonial
        ? null
        : { author: "", role: "", company: "", quote: "", avatarUrl: "" },
    }));
    onDirty();
  }, [onDirty]);

  const updateTestimonial = useCallback(
    (field: keyof PortfolioTestimonial, value: string) => {
      setForm((prev) => {
        if (!prev.testimonial) return prev;
        return {
          ...prev,
          testimonial: { ...prev.testimonial, [field]: value },
        };
      });
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
      errs.slug =
        "Slug invalid. Folosește doar litere mici, cifre și cratime.";

    if (!form.description.trim())
      errs.description = "Descrierea este obligatorie.";
    else if (form.description.trim().length < 10)
      errs.description =
        "Descrierea trebuie să aibă cel puțin 10 caractere.";

    if (!form.category.trim())
      errs.category = "Selectează o categorie.";

    const validMedia = form.media.filter((m) => m.url.trim());
    if (validMedia.length === 0)
      errs.media = "Adaugă cel puțin o imagine sau video.";

    // Validare URLs pentru media
    form.media.forEach((m, i) => {
      if (m.url.trim() && !isValidUrl(m.url.trim())) {
        errs[`media-${i}-url`] = "URL invalid.";
      }
    });

    if (form.liveUrl.trim() && !isValidUrl(form.liveUrl.trim())) {
      errs.liveUrl = "URL invalid.";
    }
    if (form.repoUrl.trim() && !isValidUrl(form.repoUrl.trim())) {
      errs.repoUrl = "URL invalid.";
    }
    if (form.thumbnailUrl.trim() && !isValidUrl(form.thumbnailUrl.trim())) {
      errs.thumbnailUrl = "URL invalid.";
    }

    if (form.testimonial) {
      if (!form.testimonial.author.trim())
        errs["testimonial-author"] = "Numele autorului este obligatoriu.";
      if (!form.testimonial.quote.trim())
        errs["testimonial-quote"] = "Textul testimonialului este obligatoriu.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  /* ── Salvare proiect curent ── */
  const saveCurrent = useCallback(() => {
    if (!validate()) return;

    const saved = formDataToPortfolio(form, selectedItem ?? undefined);

    setItems((prev) => {
      if (isNew || !selectedId) {
        saved.order =
          prev.length > 0 ? Math.max(...prev.map((s) => s.order)) + 1 : 1;
        return [...prev, saved];
      }
      return prev.map((s) =>
        s.id === selectedId ? { ...s, ...saved, id: s.id } : s,
      );
    });

    setSelectedId(saved.id);
    setIsNew(false);
    setErrors({});
  }, [form, validate, selectedItem, selectedId, isNew]);

  /* ── Ștergere proiect ── */
  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setIsNew(false);
        setForm(emptyFormData());
      }
      setShowDeleteConfirm(null);
      onDirty();
    },
    [selectedId, onDirty],
  );

  /* ── Toggle featured / active ── */
  const toggleFeatured = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, isFeatured: !s.isFeatured } : s,
        ),
      );
      onDirty();
      if (id === selectedId) {
        setForm((prev) => ({ ...prev, isFeatured: !prev.isFeatured }));
      }
    },
    [selectedId, onDirty],
  );

  const toggleActive = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, isActive: !s.isActive } : s,
        ),
      );
      onDirty();
      if (id === selectedId) {
        setForm((prev) => ({ ...prev, isActive: !prev.isActive }));
      }
    },
    [selectedId, onDirty],
  );

  /* ── Mută sus/jos ── */
  const moveItem = useCallback(
    (id: string, direction: "up" | "down") => {
      setItems((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
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
    const ordered = items.map((s, i) => ({ ...s, order: i + 1 }));
    onSave(ordered);
  }, [items, onSave]);

  /* ── Keyboard shortcuts ── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (selectedId || isNew) {
          saveCurrent();
        } else {
          handleSaveAll();
        }
      }
    },
    [selectedId, isNew, saveCurrent, handleSaveAll],
  );

  /* ── Clase input ── */
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
    <div
      className="flex flex-col xl:flex-row gap-6"
      onKeyDown={handleKeyDown}
    >
      {/* ═══════════════ LISTA PROIECTE – Stânga ═══════════════ */}
      <div className="w-full xl:w-[380px] flex-shrink-0">
        <div className="sticky top-24 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-folder-open text-[10px] text-nexus-glow/60" />
              Portofoliu
              <span className="text-white/25 font-mono text-[10px]">
                {stats.total}
              </span>
            </h3>
            <button
              type="button"
              onClick={startNew}
              className="flex items-center gap-1.5 text-[11px] font-medium text-nexus-glow bg-nexus-accent/15 hover:bg-nexus-accent/25 border border-nexus-accent/25 hover:border-nexus-accent/40 rounded-full px-3 py-1.5 transition-all duration-200"
            >
              <i className="fa-solid fa-plus text-[9px]" />
              Adaugă
            </button>
          </div>

          {/* Statistici */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-xl border border-glass-border bg-white/[0.02] p-2.5 text-center">
              <p className="text-base font-bold text-white">{stats.active}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider">
                Active
              </p>
            </div>
            <div className="rounded-xl border border-glass-border bg-white/[0.02] p-2.5 text-center">
              <p className="text-base font-bold text-amber-400">
                {stats.inactive}
              </p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider">
                Inactive
              </p>
            </div>
            <div className="rounded-xl border border-glass-border bg-white/[0.02] p-2.5 text-center">
              <p className="text-base font-bold text-gold">{stats.featured}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider">
                Featured
              </p>
            </div>
            <div className="rounded-xl border border-glass-border bg-white/[0.02] p-2.5 text-center">
              <p className="text-base font-bold text-emerald-400">
                {stats.withLinks}
              </p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider">
                Cu link
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
                placeholder="Caută proiect..."
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
              {derivedCategories.map(({ key, count }) => (
                <button
                  key={key}
                  onClick={() =>
                    setCategoryFilter(
                      categoryFilter === key ? "all" : key,
                    )
                  }
                  className={`text-[10px] font-medium rounded-full px-2.5 py-1 transition-all duration-200 flex items-center gap-1 ${
                    categoryFilter === key
                      ? getCategoryColor(key)
                      : "text-white/35 border border-transparent hover:text-white/60"
                  }`}
                >
                  {key}
                  <span className="text-[9px] opacity-60">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Lista proiecte */}
          <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-thin">
            <AnimatePresence initial={false}>
              {filteredItems.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <i className="fa-solid fa-folder-open text-2xl text-white/10 block mb-2" />
                  <p className="text-xs text-white/25">
                    {searchQuery || categoryFilter !== "all"
                      ? "Niciun proiect nu se potrivește."
                      : "Niciun proiect adăugat."}
                  </p>
                </motion.div>
              ) : (
                filteredItems.map((item, idx) => {
                  const isSelected = selectedId === item.id;
                  const hasLinks = !!(item.liveUrl || item.repoUrl);
                  const thumb =
                    item.thumbnailUrl ??
                    item.media.find((m) => m.type === "image")?.url ??
                    "";

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={() => selectItem(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group ${
                          isSelected
                            ? "bg-nexus-accent/15 border border-nexus-accent/30"
                            : "bg-white/[0.02] border border-transparent hover:border-glass-border hover:bg-white/[0.04]"
                        }`}
                      >
                        {/* Thumbnail mini */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 border border-white/[0.06]">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/15">
                              <i className="fa-solid fa-image text-sm" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium truncate ${
                                isSelected ? "text-white" : "text-white/70"
                              }`}
                            >
                              {item.title}
                            </span>
                            {!item.isActive && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400/70 border border-red-400/15 flex-shrink-0">
                                inactiv
                              </span>
                            )}
                            {item.isFeatured && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold/10 text-gold/70 border border-gold/15 flex-shrink-0">
                                <i className="fa-solid fa-star text-[7px]" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-[9px] rounded-full px-1.5 py-0.5 border ${getCategoryColor(item.category)}`}
                            >
                              {item.category}
                            </span>
                            {hasLinks && (
                              <span className="text-[9px] text-emerald-400/60 flex items-center gap-1">
                                <i className="fa-solid fa-link text-[7px]" />
                                Link
                              </span>
                            )}
                            {item.tags.length > 0 && (
                              <span className="text-[9px] text-white/20 font-mono">
                                {item.tags.length} tag
                                {item.tags.length > 1 ? "uri" : ""}
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
                              moveItem(item.id, "up");
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
                              moveItem(item.id, "down");
                            }}
                            disabled={idx === filteredItems.length - 1}
                            className="p-1 rounded text-white/20 hover:text-white/60 disabled:opacity-20"
                            title="Mută în jos"
                          >
                            <i className="fa-solid fa-chevron-down text-[10px]" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFeatured(item.id);
                            }}
                            className={`p-1 rounded transition-colors ${
                              item.isFeatured
                                ? "text-gold/70 hover:text-gold"
                                : "text-white/15 hover:text-gold/40"
                            }`}
                            title={
                              item.isFeatured
                                ? "Scoate din featured"
                                : "Marchează featured"
                            }
                          >
                            <i
                              className={`fa-solid ${item.isFeatured ? "fa-star" : "fa-star"} text-[10px]`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleActive(item.id);
                            }}
                            className={`p-1 rounded transition-colors ${
                              item.isActive
                                ? "text-emerald-400/60 hover:text-emerald-400"
                                : "text-white/15 hover:text-amber-400/70"
                            }`}
                            title={
                              item.isActive ? "Dezactivează" : "Activează"
                            }
                          >
                            <i
                              className={`fa-solid ${item.isActive ? "fa-eye" : "fa-eye-slash"} text-[10px]`}
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

      {/* ═══════════════ EDITOR – Dreapta ═══════════════ */}
      <div className="flex-1 min-w-0" ref={formRef}>
        {!selectedId && !isNew ? (
          /* Stare goală */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-glass-border flex items-center justify-center mb-5">
              <i className="fa-solid fa-folder-open text-2xl text-white/15" />
            </div>
            <h3 className="text-lg font-heading font-bold text-white/40 mb-2">
              Editor Portofoliu
            </h3>
            <p className="text-sm text-white/25 max-w-md leading-relaxed mb-6">
              Selectează un proiect din listă pentru a-l edita sau creează unul
              nou.
            </p>
            <button
              type="button"
              onClick={startNew}
              className="glass-btn text-sm px-6 py-2.5"
            >
              <i className="fa-solid fa-plus text-xs" />
              <span>Proiect nou</span>
            </button>
            {items.length === 0 && (
              <p className="text-[10px] text-white/15 mt-4 font-mono">
                Nu există proiecte în portofoliu.
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
                    {isNew ? "Proiect nou" : "Editare proiect"}
                  </h3>
                  {Object.keys(errors).length > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-red-400/80 bg-red-500/10 border border-red-400/20 rounded-full px-2.5 py-0.5">
                      <i className="fa-solid fa-triangle-exclamation text-[9px]" />
                      {Object.keys(errors).length} erori
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isNew && selectedId && (
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
                    {isNew ? "Adaugă în listă" : "Actualizează"}
                  </button>
                </div>
              </div>

              {/* Confirmare ștergere */}
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
                        Ești sigur că vrei să ștergi acest proiect? Acțiunea
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
                          onClick={() => deleteItem(showDeleteConfirm)}
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
                    field="port-title"
                    error={errors.title}
                    required
                  >
                    <input
                      id="port-title"
                      type="text"
                      value={form.title}
                      onChange={(e) => update("title", e.target.value)}
                      placeholder="FinDash Analytics"
                      className={inputClass("title")}
                    />
                  </Field>

                  <Field
                    label="Slug"
                    field="port-slug"
                    error={errors.slug}
                    required
                  >
                    <div className="relative">
                      <input
                        id="port-slug"
                        type="text"
                        value={form.slug}
                        onChange={(e) => update("slug", e.target.value)}
                        placeholder="findash-analytics"
                        className={`${inputClass("slug")} font-mono text-xs`}
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

                <Field label="Subtitlu (opțional)" field="port-subtitle">
                  <input
                    id="port-subtitle"
                    type="text"
                    value={form.subtitle}
                    onChange={(e) => update("subtitle", e.target.value)}
                    placeholder="Subtitlu scurt pentru card"
                    className={inputClass("subtitle")}
                  />
                </Field>

                <Field
                  label="Descriere"
                  field="port-desc"
                  error={errors.description}
                  required
                >
                  <textarea
                    id="port-desc"
                    rows={3}
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Descrierea proiectului..."
                    className={inputClass("description")}
                  />
                  <CharCount
                    current={form.description.length}
                    max={300}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Provocare (opțional)"
                    field="port-challenge"
                  >
                    <textarea
                      id="port-challenge"
                      rows={2}
                      value={form.challenge}
                      onChange={(e) => update("challenge", e.target.value)}
                      placeholder="Care a fost provocarea?"
                      className={inputClass("challenge")}
                    />
                  </Field>

                  <Field
                    label="Soluție (opțional)"
                    field="port-solution"
                  >
                    <textarea
                      id="port-solution"
                      rows={2}
                      value={form.solution}
                      onChange={(e) => update("solution", e.target.value)}
                      placeholder="Cum ai rezolvat?"
                      className={inputClass("solution")}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Categorie */}
                  <Field
                    label="Categorie"
                    field="port-category"
                    error={errors.category}
                    required
                  >
                    <select
                      id="port-category"
                      value={form.category}
                      onChange={(e) => update("category", e.target.value)}
                      className={`${inputClass("category")} appearance-none`}
                    >
                      <option value="">Alege categoria...</option>
                      {PORTFOLIO_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {/* Nume client */}
                  <Field label="Client (opțional)" field="port-client">
                    <input
                      id="port-client"
                      type="text"
                      value={form.clientName}
                      onChange={(e) => update("clientName", e.target.value)}
                      placeholder="Nume client"
                      className={inputClass("clientName")}
                    />
                  </Field>

                  {/* Data completării */}
                  <Field
                    label="Data finalizării (opțional)"
                    field="port-date"
                  >
                    <input
                      id="port-date"
                      type="date"
                      value={form.completionDate}
                      onChange={(e) =>
                        update("completionDate", e.target.value)
                      }
                      className={inputClass("completionDate")}
                    />
                  </Field>
                </div>

                {/* Toggle-uri */}
                <div className="flex flex-wrap items-center gap-6">
                  <ToggleField
                    label={form.isActive ? "Activ" : "Inactiv"}
                    checked={form.isActive}
                    onChange={(v) => update("isActive", v)}
                  />
                  <ToggleField
                    label="Featured (evidențiat)"
                    checked={form.isFeatured}
                    onChange={(v) => update("isFeatured", v)}
                  />
                </div>
              </fieldset>

              {/* ── Secțiunea: Link-uri ── */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-link text-[10px] text-nexus-glow/60" />
                  Link-uri
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="URL Live Demo (opțional)"
                    field="port-live"
                    error={errors.liveUrl}
                  >
                    <input
                      id="port-live"
                      type="text"
                      value={form.liveUrl}
                      onChange={(e) => update("liveUrl", e.target.value)}
                      placeholder="https://..."
                      className={inputClass("liveUrl")}
                    />
                  </Field>

                  <Field
                    label="URL Repo / Cod Sursă (opțional)"
                    field="port-repo"
                    error={errors.repoUrl}
                  >
                    <input
                      id="port-repo"
                      type="text"
                      value={form.repoUrl}
                      onChange={(e) => update("repoUrl", e.target.value)}
                      placeholder="https://github.com/..."
                      className={inputClass("repoUrl")}
                    />
                  </Field>
                </div>
              </fieldset>

              {/* ── Secțiunea: Media (imagini & video) ── */}
              <fieldset className="space-y-3">
                <div className="flex items-center justify-between">
                  <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-images text-[10px] text-nexus-glow/60" />
                    Media (imagini & video)
                  </legend>
                  <button
                    type="button"
                    onClick={addMedia}
                    className="text-[10px] text-nexus-glow/70 hover:text-nexus-glow flex items-center gap-1"
                  >
                    <i className="fa-solid fa-plus text-[8px]" />
                    Adaugă media
                  </button>
                </div>
                {errors.media && (
                  <p className="text-xs text-red-400/80 flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-exclamation text-[10px]" />
                    {errors.media}
                  </p>
                )}

                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {form.media.map((m, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-xl border border-glass-border bg-white/[0.01] p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-white/20">
                              #{idx + 1}
                            </span>
                            {/* Tip media */}
                            <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => updateMedia(idx, "type", "image")}
                                className={`text-[10px] px-2 py-1 rounded-md transition-all ${
                                  m.type === "image"
                                    ? "bg-nexus-accent/20 text-white"
                                    : "text-white/25 hover:text-white/50"
                                }`}
                              >
                                <i className="fa-solid fa-image mr-1 text-[9px]" />
                                Imagine
                              </button>
                              <button
                                type="button"
                                onClick={() => updateMedia(idx, "type", "video")}
                                className={`text-[10px] px-2 py-1 rounded-md transition-all ${
                                  m.type === "video"
                                    ? "bg-nexus-accent/20 text-white"
                                    : "text-white/25 hover:text-white/50"
                                }`}
                              >
                                <i className="fa-solid fa-video mr-1 text-[9px]" />
                                Video
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMedia(idx)}
                            disabled={form.media.length <= 1}
                            className="p-1.5 text-white/15 hover:text-red-400/60 disabled:opacity-20 transition-colors"
                          >
                            <i className="fa-solid fa-trash-can text-[10px]" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field
                            label="URL"
                            field={`media-${idx}-url`}
                            error={errors[`media-${idx}-url`]}
                          >
                            <input
                              type="text"
                              value={m.url}
                              onChange={(e) =>
                                updateMedia(idx, "url", e.target.value)
                              }
                              placeholder={
                                m.type === "image"
                                  ? "/images/proiect.jpg"
                                  : "/video/proiect.mp4"
                              }
                              className={inputClass(`media-${idx}-url`)}
                            />
                          </Field>

                          <Field label="Text alternativ" field={`media-${idx}-alt`}>
                            <input
                              type="text"
                              value={m.alt ?? ""}
                              onChange={(e) =>
                                updateMedia(idx, "alt", e.target.value)
                              }
                              placeholder="Descrierea imaginii"
                              className={inputClass(`media-${idx}-alt`)}
                            />
                          </Field>
                        </div>

                        {m.type === "video" && (
                          <Field label="URL Poster (thumbnail video)" field={`media-${idx}-poster`}>
                            <input
                              type="text"
                              value={m.poster ?? ""}
                              onChange={(e) =>
                                updateMedia(idx, "poster", e.target.value)
                              }
                              placeholder="/images/video-poster.jpg"
                              className={inputClass(`media-${idx}-poster`)}
                            />
                          </Field>
                        )}

                        {/* Preview thumbnail */}
                        {m.url.trim() && m.type === "image" && (
                          <div className="w-full h-24 rounded-lg overflow-hidden bg-white/[0.02] border border-white/[0.04]">
                            <img
                              src={m.url}
                              alt={m.alt ?? ""}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Thumbnail URL */}
                <Field
                  label="URL Thumbnail (opțional, suprascrie prima imagine)"
                  field="port-thumb"
                  error={errors.thumbnailUrl}
                >
                  <input
                    id="port-thumb"
                    type="text"
                    value={form.thumbnailUrl}
                    onChange={(e) => update("thumbnailUrl", e.target.value)}
                    placeholder="/images/thumbnail.jpg"
                    className={inputClass("thumbnailUrl")}
                  />
                </Field>
              </fieldset>

              {/* ── Secțiunea: Tags ── */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-tags text-[10px] text-nexus-glow/60" />
                  Tags / Tehnologii
                </legend>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Adaugă tag (ex: React, Node.js)..."
                    className={inputClass("tags")}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="p-2.5 rounded-xl bg-white/[0.04] border border-glass-border text-white/40 hover:text-white/70 hover:border-glass-border-strong transition-all"
                  >
                    <i className="fa-solid fa-plus text-xs" />
                  </button>
                </div>

                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence initial={false}>
                      {form.tags.map((tag, idx) => (
                        <motion.span
                          key={`${tag}-${idx}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="inline-flex items-center gap-1.5 text-[11px] text-white/60 bg-white/[0.05] border border-white/[0.08] rounded-full pl-3 pr-1.5 py-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(idx)}
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

              {/* ── Secțiunea: Rezultate ── */}
              <fieldset className="space-y-3">
                <div className="flex items-center justify-between">
                  <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-chart-bar text-[10px] text-nexus-glow/60" />
                    Rezultate (opțional)
                  </legend>
                  <button
                    type="button"
                    onClick={addResult}
                    className="text-[10px] text-nexus-glow/70 hover:text-nexus-glow flex items-center gap-1"
                  >
                    <i className="fa-solid fa-plus text-[8px]" />
                    Adaugă rezultat
                  </button>
                </div>

                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {form.results.map((result, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2"
                      >
                        <i className="fa-solid fa-circle-check text-[8px] text-emerald-400/40 flex-shrink-0" />
                        <input
                          type="text"
                          value={result}
                          onChange={(e) =>
                            updateResult(idx, e.target.value)
                          }
                          placeholder={`Rezultatul ${idx + 1}`}
                          className={`${inputClass(`result-${idx}`)} text-xs py-1.5`}
                        />
                        <button
                          type="button"
                          onClick={() => removeResult(idx)}
                          className="p-1 text-white/10 hover:text-red-400/50 transition-colors"
                        >
                          <i className="fa-solid fa-xmark text-[9px]" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </fieldset>

              {/* ── Secțiunea: Testimonial ── */}
              <fieldset className="space-y-3">
                <div className="flex items-center justify-between">
                  <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-quote-right text-[10px] text-nexus-glow/60" />
                    Testimonial (opțional)
                  </legend>
                  <button
                    type="button"
                    onClick={toggleTestimonial}
                    className={`text-[10px] flex items-center gap-1 transition-colors ${
                      form.testimonial
                        ? "text-red-400/60 hover:text-red-400"
                        : "text-nexus-glow/70 hover:text-nexus-glow"
                    }`}
                  >
                    <i
                      className={`fa-solid ${form.testimonial ? "fa-trash-can" : "fa-plus"} text-[8px]`}
                    />
                    {form.testimonial ? "Elimină" : "Adaugă testimonial"}
                  </button>
                </div>

                <AnimatePresence>
                  {form.testimonial && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-glass-border bg-white/[0.01] p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field
                            label="Autor"
                            field="testimonial-author"
                            error={errors["testimonial-author"]}
                            required
                          >
                            <input
                              type="text"
                              value={form.testimonial.author}
                              onChange={(e) =>
                                updateTestimonial("author", e.target.value)
                              }
                              placeholder="Nume autor"
                              className={inputClass("testimonial-author")}
                            />
                          </Field>

                          <Field label="Rol (opțional)" field="testimonial-role">
                            <input
                              type="text"
                              value={form.testimonial.role ?? ""}
                              onChange={(e) =>
                                updateTestimonial("role", e.target.value)
                              }
                              placeholder="CEO, Fondator..."
                              className={inputClass("testimonial-role")}
                            />
                          </Field>
                        </div>

                        <Field label="Companie (opțional)" field="testimonial-company">
                          <input
                            type="text"
                            value={form.testimonial.company ?? ""}
                            onChange={(e) =>
                              updateTestimonial("company", e.target.value)
                            }
                            placeholder="Nume companie"
                            className={inputClass("testimonial-company")}
                          />
                        </Field>

                        <Field
                          label="Text testimonial"
                          field="testimonial-quote"
                          error={errors["testimonial-quote"]}
                          required
                        >
                          <textarea
                            rows={3}
                            value={form.testimonial.quote}
                            onChange={(e) =>
                              updateTestimonial("quote", e.target.value)
                            }
                            placeholder="Ce a spus clientul despre proiect..."
                            className={inputClass("testimonial-quote")}
                          />
                        </Field>

                        <Field
                          label="URL Avatar (opțional)"
                          field="testimonial-avatar"
                        >
                          <input
                            type="text"
                            value={form.testimonial.avatarUrl ?? ""}
                            onChange={(e) =>
                              updateTestimonial("avatarUrl", e.target.value)
                            }
                            placeholder="/images/avatars/client.jpg"
                            className={inputClass("testimonial-avatar")}
                          />
                        </Field>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </fieldset>

              {/* ── Preview card ── */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-eye text-[10px] text-nexus-glow/60" />
                  Previzualizare card
                </legend>

                <div className="rounded-glass-lg border border-glass-border bg-white/[0.01] overflow-hidden max-w-md">
                  {/* Imagine preview */}
                  <div className="aspect-[4/3] bg-white/[0.02] overflow-hidden">
                    {form.media.filter((m) => m.url.trim() && m.type === "image")
                      .length > 0 ? (
                      <img
                        src={
                          form.thumbnailUrl ||
                          form.media.find(
                            (m) => m.url.trim() && m.type === "image",
                          )!.url
                        }
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10">
                        <i className="fa-solid fa-image text-4xl" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {form.category && (
                        <span
                          className={`text-[9px] font-medium rounded-full px-2 py-0.5 border ${getCategoryColor(form.category)}`}
                        >
                          {form.category}
                        </span>
                      )}
                      {form.isFeatured && (
                        <span className="text-[9px] font-medium rounded-full px-2 py-0.5 border bg-gold/15 text-gold/80 border-gold/25">
                          <i className="fa-solid fa-star text-[7px] mr-1" />
                          Featured
                        </span>
                      )}
                    </div>

                    <h4 className="text-white font-heading font-bold text-base">
                      {form.title.trim() || "Titlu proiect"}
                    </h4>

                    {form.subtitle.trim() && (
                      <p className="text-xs text-white/40">
                        {form.subtitle}
                      </p>
                    )}

                    <p className="text-xs text-white/45 leading-relaxed line-clamp-2">
                      {form.description.trim() ||
                        "Descrierea proiectului..."}
                    </p>

                    {/* Tags preview */}
                    {form.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {form.tags.slice(0, 4).map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full bg-white/6 border border-white/8 text-[10px] text-white/45"
                          >
                            {tag}
                          </span>
                        ))}
                        {form.tags.length > 4 && (
                          <span className="text-[10px] text-white/25">
                            +{form.tags.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Link-uri */}
                    <div className="flex items-center gap-2 pt-1">
                      {form.liveUrl.trim() && (
                        <span className="text-[10px] text-emerald-400/70 flex items-center gap-1">
                          <i className="fa-solid fa-eye text-[8px]" />
                          Live Demo
                        </span>
                      )}
                      {form.repoUrl.trim() && (
                        <span className="text-[10px] text-white/40 flex items-center gap-1">
                          <i className="fa-solid fa-code text-[8px]" />
                          Cod Sursă
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
                  isNew ||
                  (selectedItem !== null &&
                    JSON.stringify(formDataToPortfolio(form)) !==
                      JSON.stringify(selectedItem))
                }
                itemCount={items.length}
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
  itemCount,
  onSaveAll,
}: {
  saving: boolean;
  hasErrors: boolean;
  hasChanges: boolean;
  itemCount: number;
  onSaveAll: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-glass-border">
      <button
        type="button"
        onClick={onSaveAll}
        disabled={saving || hasErrors || itemCount === 0}
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
              Salvează tot portofoliul ({itemCount})
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

/* ── Validare URL simplă ── */
function isValidUrl(str: string): boolean {
  if (str.startsWith("/") || str.startsWith("#")) return true;
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/* ═════════════════════════════════════════════════════════
   Exporturi denumite
   ═════════════════════════════════════════════════════════ */

export type { PortfolioFormData, FormErrors };
export { PORTFOLIO_CATEGORIES, CATEGORY_COLORS, generateSlug };