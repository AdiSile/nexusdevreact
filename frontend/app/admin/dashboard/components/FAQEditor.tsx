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
import type { FAQItem } from "../../../../lib/types";

/* ═══════════════════════════════════════════════════════════════════════════
   FAQEditor – CRUD complet pentru întrebări și răspunsuri frecvente
   Suportă: listare, adăugare, editare, ștergere, reordonare,
   categorii, toggle activ/inactiv, previzualizare live.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────
   Tipuri locale
   ───────────────────────────────────────────────────────── */

interface FAQFormData {
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
}

interface FormErrors {
  [field: string]: string;
}

/* ─────────────────────────────────────────────────────────
   Constante
   ───────────────────────────────────────────────────────── */

const FAQ_CATEGORIES = [
  { value: "", label: "Fără categorie", icon: "fa-layer-group" },
  { value: "general", label: "General", icon: "fa-circle-info" },
  { value: "tehnic", label: "Tehnic", icon: "fa-code" },
  { value: "prețuri", label: "Prețuri", icon: "fa-tags" },
  { value: "proiecte", label: "Proiecte", icon: "fa-briefcase" },
  { value: "colaborare", label: "Colaborare", icon: "fa-handshake" },
  { value: "suport", label: "Suport", icon: "fa-headset" },
  { value: "legal", label: "Legal", icon: "fa-scale-balanced" },
];

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-blue-500/20 text-blue-400 border-blue-400/30",
  tehnic: "bg-purple-500/20 text-purple-400 border-purple-400/30",
  prețuri: "bg-gold/20 text-gold border-gold/30",
  proiecte: "bg-emerald-500/20 text-emerald-400 border-emerald-400/30",
  colaborare: "bg-amber-500/20 text-amber-400 border-amber-400/30",
  suport: "bg-cyan-500/20 text-cyan-400 border-cyan-400/30",
  legal: "bg-red-500/20 text-red-400 border-red-400/30",
};

/* ─────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────── */

function generateId(): string {
  return `faq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyFormData(): FAQFormData {
  return {
    question: "",
    answer: "",
    category: "",
    isActive: true,
  };
}

function faqItemToFormData(item: FAQItem): FAQFormData {
  return {
    question: item.question,
    answer: item.answer,
    category: item.category ?? "",
    isActive: item.isActive,
  };
}

function formDataToFAQItem(
  form: FAQFormData,
  existing?: FAQItem,
): FAQItem {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? generateId(),
    question: form.question.trim(),
    answer: form.answer.trim(),
    category: form.category.trim() || undefined,
    order: existing?.order ?? 0,
    isActive: form.isActive,
    relatedServiceIds: existing?.relatedServiceIds ?? undefined,
  };
}

/* ═════════════════════════════════════════════════════════
   Componenta principală
   ═════════════════════════════════════════════════════════ */

export interface FAQEditorProps {
  /** Lista curentă de FAQ-uri */
  faqs: readonly FAQItem[];
  /** Callback salvare completă (înlocuiește toate FAQ-urile) */
  onSave: (faqs: FAQItem[]) => void;
  /** Callback dirty */
  onDirty: () => void;
  /** Stare salvare */
  saving: boolean;
}

export default function FAQEditor({
  faqs: initialFaqs,
  onSave,
  onDirty,
  saving,
}: FAQEditorProps) {
  /* ── Stare principală ── */
  const [faqs, setFaqs] = useState<FAQItem[]>(() =>
    [...initialFaqs].sort((a, b) => a.order - b.order),
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FAQFormData>(emptyFormData());
  const [errors, setErrors] = useState<FormErrors>({});
  const [isNewFaq, setIsNewFaq] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  /* ── Sincronizare date externe ── */
  useEffect(() => {
    setFaqs([...initialFaqs].sort((a, b) => a.order - b.order));
  }, [initialFaqs]);

  /* ── FAQ selectat ── */
  const selectedFaq = useMemo(
    () => faqs.find((f) => f.id === selectedId) ?? null,
    [faqs, selectedId],
  );

  /* ── FAQ-uri filtrate ── */
  const filteredFaqs = useMemo(() => {
    let list = faqs;
    if (categoryFilter && categoryFilter !== "all") {
      list = list.filter((f) => (f.category ?? "") === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q) ||
          (f.category ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [faqs, categoryFilter, searchQuery]);

  /* ── Statistici ── */
  const stats = useMemo(() => {
    const active = faqs.filter((f) => f.isActive).length;
    const inactive = faqs.length - active;
    const categorized = faqs.filter((f) => f.category).length;
    return { active, inactive, categorized, total: faqs.length };
  }, [faqs]);

  /* ── Categorii cu FAQ-uri ── */
  const usedCategories = useMemo(() => {
    const catSet = new Set(faqs.map((f) => f.category ?? "").filter(Boolean));
    return FAQ_CATEGORIES.filter(
      (c) => c.value === "" || catSet.has(c.value),
    );
  }, [faqs]);

  /* ── Selectează FAQ ── */
  const selectFaq = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      setIsNewFaq(false);
      setErrors({});

      if (id) {
        const faq = faqs.find((f) => f.id === id);
        if (faq) {
          setForm(faqItemToFormData(faq));
        }
      } else {
        setForm(emptyFormData());
      }
    },
    [faqs],
  );

  /* ── FAQ nou ── */
  const startNewFaq = useCallback(() => {
    setSelectedId(null);
    setIsNewFaq(true);
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
    },
    [onDirty],
  );

  /* ── Validare ── */
  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};

    if (!form.question.trim()) {
      errs.question = "Întrebarea este obligatorie.";
    } else if (form.question.trim().length < 5) {
      errs.question = "Întrebarea trebuie să aibă cel puțin 5 caractere.";
    } else if (form.question.trim().length > 200) {
      errs.question = "Întrebarea nu poate depăși 200 de caractere.";
    }

    if (!form.answer.trim()) {
      errs.answer = "Răspunsul este obligatoriu.";
    } else if (form.answer.trim().length < 10) {
      errs.answer = "Răspunsul trebuie să aibă cel puțin 10 caractere.";
    } else if (form.answer.trim().length > 2000) {
      errs.answer = "Răspunsul nu poate depăși 2000 de caractere.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  /* ── Salvare FAQ curent ── */
  const saveCurrent = useCallback(() => {
    if (!validate()) return;

    const saved = formDataToFAQItem(form, selectedFaq ?? undefined);

    setFaqs((prev) => {
      if (isNewFaq || !selectedId) {
        saved.order = prev.length > 0 ? Math.max(...prev.map((f) => f.order)) + 1 : 1;
        return [...prev, saved];
      }
      return prev.map((f) =>
        f.id === selectedId ? { ...f, ...saved, id: f.id, order: f.order } : f,
      );
    });

    setSelectedId(saved.id);
    setIsNewFaq(false);
    setErrors({});
  }, [form, validate, selectedFaq, selectedId, isNewFaq]);

  /* ── Ștergere FAQ ── */
  const deleteFaq = useCallback(
    (id: string) => {
      setFaqs((prev) => {
        const filtered = prev.filter((f) => f.id !== id);
        return filtered.map((f, i) => ({ ...f, order: i + 1 }));
      });
      if (selectedId === id) {
        setSelectedId(null);
        setIsNewFaq(false);
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
      setFaqs((prev) =>
        prev.map((f) => (f.id === id ? { ...f, isActive: !f.isActive } : f)),
      );
      onDirty();

      if (id === selectedId) {
        setForm((prev) => ({ ...prev, isActive: !prev.isActive }));
      }
    },
    [selectedId, onDirty],
  );

  /* ── Mută în sus/jos ── */
  const moveFaq = useCallback(
    (id: string, direction: "up" | "down") => {
      setFaqs((prev) => {
        const idx = prev.findIndex((f) => f.id === id);
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

  /* ── Submit final (salvează toată lista) ── */
  const handleSaveAll = useCallback(() => {
    const ordered = faqs.map((f, i) => ({ ...f, order: i + 1 }));
    onSave(ordered);
  }, [faqs, onSave]);

  /* ── Keyboard shortcuts ── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (selectedId || isNewFaq) {
          saveCurrent();
        } else {
          handleSaveAll();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        saveCurrent();
      }
    },
    [selectedId, isNewFaq, saveCurrent, handleSaveAll],
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
          LISTA DE FAQ-URI – Stânga
          ═════════════════════════════════════════ */}
      <div className="w-full xl:w-[380px] flex-shrink-0">
        <div className="sticky top-24 space-y-4">
          {/* Header cu statistici */}
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-circle-question text-[10px] text-nexus-glow/60" />
              Întrebări FAQ
              <span className="text-white/25 font-mono text-[10px]">
                {stats.total}
              </span>
            </h3>
            <button
              type="button"
              onClick={startNewFaq}
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
              <p className="text-lg font-bold text-gold">{stats.categorized}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">
                Categorii
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
                placeholder="Caută întrebare..."
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
              {usedCategories
                .filter((c) => c.value !== "")
                .map((cat) => {
                  const count = faqs.filter(
                    (f) => (f.category ?? "") === cat.value,
                  ).length;
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
                          ? (CATEGORY_COLORS[cat.value] ?? "")
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

          {/* Lista FAQ */}
          <div className="space-y-1 max-h-[50vh] overflow-y-auto scrollbar-thin">
            <AnimatePresence initial={false}>
              {filteredFaqs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <i className="fa-solid fa-folder-open text-2xl text-white/10 block mb-2" />
                  <p className="text-xs text-white/25">
                    {searchQuery || categoryFilter !== "all"
                      ? "Nicio întrebare nu se potrivește filtrelor."
                      : "Nicio întrebare adăugată."}
                  </p>
                </motion.div>
              ) : (
                filteredFaqs.map((faq, idx) => {
                  const isSelected = selectedId === faq.id;
                  const catInfo = FAQ_CATEGORIES.find(
                    (c) => c.value === (faq.category ?? ""),
                  );

                  return (
                    <motion.div
                      key={faq.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={() => selectFaq(faq.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group ${
                          isSelected
                            ? "bg-nexus-accent/15 border border-nexus-accent/30"
                            : "bg-white/[0.02] border border-transparent hover:border-glass-border hover:bg-white/[0.04]"
                        }`}
                      >
                        {/* Icon FAQ */}
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm transition-all duration-200 ${
                            isSelected
                              ? "bg-nexus-accent/25 text-nexus-glow"
                              : "bg-white/5 text-white/30 group-hover:text-white/50"
                          }`}
                        >
                          <i className="fa-solid fa-circle-question" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium truncate block ${
                                isSelected ? "text-white" : "text-white/70"
                              }`}
                            >
                              {faq.question}
                            </span>
                            {!faq.isActive && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400/70 border border-red-400/15 flex-shrink-0">
                                inactiv
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-white/30 mt-1 line-clamp-2 leading-relaxed">
                            {faq.answer}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {catInfo && (
                              <span className="text-[9px] text-white/20 flex items-center gap-1">
                                <i
                                  className={`fa-solid ${catInfo.icon} text-[7px]`}
                                />
                                {catInfo.label}
                              </span>
                            )}
                            {faq.relatedServiceIds &&
                              faq.relatedServiceIds.length > 0 && (
                                <span className="text-[9px] text-white/20 font-mono">
                                  {faq.relatedServiceIds.length} serviciu
                                  {faq.relatedServiceIds.length !== 1
                                    ? "i"
                                    : ""}
                                </span>
                              )}
                          </div>
                        </div>

                        {/* Acțiuni rapide */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveFaq(faq.id, "up");
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
                              moveFaq(faq.id, "down");
                            }}
                            disabled={idx === filteredFaqs.length - 1}
                            className="p-1 rounded text-white/20 hover:text-white/60 disabled:opacity-20"
                            title="Mută în jos"
                          >
                            <i className="fa-solid fa-chevron-down text-[10px]" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleActive(faq.id);
                            }}
                            className={`p-1 rounded transition-colors ${
                              faq.isActive
                                ? "text-emerald-400/60 hover:text-emerald-400"
                                : "text-white/15 hover:text-amber-400/70"
                            }`}
                            title={faq.isActive ? "Dezactivează" : "Activează"}
                          >
                            <i
                              className={`fa-solid ${
                                faq.isActive ? "fa-eye" : "fa-eye-slash"
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

          {/* Sfaturi rapide */}
          <div className="rounded-xl border border-glass-border bg-white/[0.02] p-4">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">
              <i className="fa-solid fa-lightbulb text-gold/50 mr-1.5" />
              Sfaturi
            </p>
            <ul className="space-y-2 text-[11px] text-white/40 leading-relaxed">
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                Întrebările clare și concise cresc șansele de conversie.
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                Folosește categorii pentru a organiza FAQ-urile pe secțiuni
                logice.
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                Răspunsurile detaliate, dar la obiect, inspiră încredere.
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                FAQ-urile inactive nu se afișează pe site, dar se păstrează
                pentru utilizare ulterioară.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════
          EDITOR / FORMULAR – Dreapta
          ═════════════════════════════════════════ */}
      <div className="flex-1 min-w-0" ref={formRef}>
        {!selectedId && !isNewFaq ? (
          /* Stare goală */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-glass-border flex items-center justify-center mb-5">
              <i className="fa-solid fa-circle-question text-2xl text-white/15" />
            </div>
            <h3 className="text-lg font-heading font-bold text-white/40 mb-2">
              Editor FAQ
            </h3>
            <p className="text-sm text-white/25 max-w-md leading-relaxed mb-6">
              Selectează o întrebare din listă pentru a o edita sau creează una
              nouă.
            </p>
            <button
              type="button"
              onClick={startNewFaq}
              className="glass-btn text-sm px-6 py-2.5"
            >
              <i className="fa-solid fa-plus text-xs" />
              <span>Întrebare nouă</span>
            </button>
            {faqs.length === 0 && (
              <p className="text-[10px] text-white/15 mt-4 font-mono">
                Nu există FAQ-uri configurate. Secțiunea FAQ nu va fi afișată pe
                site.
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
                    {isNewFaq ? "Întrebare nouă" : "Editare întrebare"}
                  </h3>
                  {Object.keys(errors).length > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-red-400/80 bg-red-500/10 border border-red-400/20 rounded-full px-2.5 py-0.5">
                      <i className="fa-solid fa-triangle-exclamation text-[9px]" />
                      {Object.keys(errors).length} erori
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isNewFaq && selectedId && (
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
                    {isNewFaq ? "Adaugă în listă" : "Actualizează"}
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
                        Ești sigur că vrei să ștergi această întrebare?
                        Acțiunea este ireversibilă.
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
                          onClick={() => deleteFaq(showDeleteConfirm)}
                          className="text-xs font-medium text-red-400 bg-red-500/15 border border-red-400/25 rounded-lg px-4 py-1.5"
                        >
                          Șterge definitiv
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Secțiunea: Întrebare ── */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-circle-question text-[10px] text-nexus-glow/60" />
                  Întrebare
                </legend>

                <Field
                  label="Întrebare"
                  field="faq-question"
                  error={errors.question}
                  required
                >
                  <input
                    id="faq-question"
                    type="text"
                    value={form.question}
                    onChange={(e) => update("question", e.target.value)}
                    placeholder="Ex: Cât durează un proiect tipic?"
                    className={inputClass("question")}
                    aria-required="true"
                    aria-invalid={!!errors.question}
                    aria-describedby={
                      errors.question ? "faq-question-err" : undefined
                    }
                  />
                  <CharCount current={form.question.length} max={200} />
                </Field>
              </fieldset>

              {/* ── Secțiunea: Răspuns ── */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-comment-dots text-[10px] text-nexus-glow/60" />
                  Răspuns
                </legend>

                <Field
                  label="Răspuns"
                  field="faq-answer"
                  error={errors.answer}
                  required
                >
                  <textarea
                    id="faq-answer"
                    rows={6}
                    value={form.answer}
                    onChange={(e) => update("answer", e.target.value)}
                    placeholder="Scrie răspunsul detaliat aici..."
                    className={inputClass("answer")}
                    aria-required="true"
                    aria-invalid={!!errors.answer}
                    aria-describedby={
                      errors.answer ? "faq-answer-err" : undefined
                    }
                  />
                  <CharCount current={form.answer.length} max={2000} />
                </Field>
              </fieldset>

              {/* ── Secțiunea: Setări ── */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-gear text-[10px] text-nexus-glow/60" />
                  Setări
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Categorie */}
                  <Field label="Categorie" field="faq-category">
                    <select
                      id="faq-category"
                      value={form.category}
                      onChange={(e) => update("category", e.target.value)}
                      className={`${inputClass("category")} appearance-none`}
                    >
                      {FAQ_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {/* Activ/Inactiv */}
                  <Field label="Stare" field="faq-active">
                    <ToggleField
                      label={form.isActive ? "Activă" : "Inactivă"}
                      checked={form.isActive}
                      onChange={(v) => update("isActive", v)}
                    />
                  </Field>
                </div>

                {/* Badge categorie selected */}
                {form.category && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-white/25">
                      Previzualizare badge:
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2.5 py-0.5 border ${
                        CATEGORY_COLORS[form.category] ?? ""
                      }`}
                    >
                      <i
                        className={`fa-solid ${
                          FAQ_CATEGORIES.find((c) => c.value === form.category)
                            ?.icon ?? "fa-layer-group"
                        } text-[8px]`}
                      />
                      {FAQ_CATEGORIES.find((c) => c.value === form.category)
                        ?.label ?? form.category}
                    </span>
                  </div>
                )}
              </fieldset>

              {/* ── Previzualizare card FAQ ── */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-eye text-[10px] text-nexus-glow/60" />
                  Previzualizare live
                </legend>

                <div className="rounded-glass-lg border border-glass-border bg-white/[0.01] overflow-hidden">
                  {/* Întrebare (header expandabil simulat) */}
                  <div className="px-5 py-4 flex items-start justify-between gap-3 bg-white/[0.02] border-b border-white/[0.04]">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-nexus-accent/20 border border-nexus-accent/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="fa-solid fa-circle-question text-xs text-nexus-glow" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium text-sm leading-relaxed">
                          {form.question.trim() || "Întrebarea ta aici..."}
                        </h4>
                        {form.category && (
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-medium rounded-full px-2 py-0.5 border mt-1.5 ${
                              CATEGORY_COLORS[form.category] ?? ""
                            }`}
                          >
                            <i
                              className={`fa-solid ${
                                FAQ_CATEGORIES.find(
                                  (c) => c.value === form.category,
                                )?.icon ?? "fa-layer-group"
                              } text-[7px]`}
                            />
                            {FAQ_CATEGORIES.find(
                              (c) => c.value === form.category,
                            )?.label ?? form.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 mt-1">
                      <i className="fa-solid fa-chevron-down text-white/20 text-xs rotate-180" />
                    </div>
                  </div>

                  {/* Răspuns (expandat) */}
                  <div className="px-5 py-4">
                    <p className="text-sm text-white/55 leading-relaxed whitespace-pre-wrap">
                      {form.answer.trim() || "Răspunsul tău aici..."}
                    </p>
                    {form.answer.trim() && (
                      <p className="text-[10px] text-white/20 mt-3 font-mono">
                        ~{form.answer.trim().split(/\s+/).length} cuvinte ·{" "}
                        {form.answer.trim().length} caractere
                      </p>
                    )}
                  </div>

                  {/* Status bar */}
                  <div className="px-5 py-2.5 bg-white/[0.01] border-t border-white/[0.04] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          form.isActive
                            ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]"
                            : "bg-red-400/50"
                        }`}
                      />
                      <span className="text-[10px] text-white/25 font-mono">
                        {form.isActive ? "Activă · Se afișează" : "Inactivă · Ascunsă"}
                      </span>
                    </div>
                    {form.isActive && (
                      <span className="text-[10px] text-emerald-400/40 font-mono">
                        <i className="fa-solid fa-circle-check text-[8px] mr-1" />
                        Live
                      </span>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* ── Buton salvare globală ── */}
              <SubmitButton
                saving={saving}
                hasErrors={Object.keys(errors).length > 0}
                hasChanges={
                  isNewFaq ||
                  (selectedFaq !== null &&
                    JSON.stringify(formDataToFAQItem(form)) !==
                      JSON.stringify(faqItemToFormData(selectedFaq)))
                }
                faqCount={faqs.length}
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
      aria-pressed={checked}
      role="switch"
      aria-checked={checked}
    >
      <div
        className={`
          w-10 h-5 rounded-full relative transition-all duration-300
          ${
            checked
              ? "bg-emerald-500/70 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
              : "bg-white/10"
          }
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
  faqCount,
  onSaveAll,
}: {
  saving: boolean;
  hasErrors: boolean;
  hasChanges: boolean;
  faqCount: number;
  onSaveAll: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-glass-border">
      <button
        type="button"
        onClick={onSaveAll}
        disabled={saving || hasErrors || faqCount === 0}
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
              Salvează toate FAQ-urile ({faqCount})
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

export type { FAQFormData, FormErrors };
export { FAQ_CATEGORIES, CATEGORY_COLORS };