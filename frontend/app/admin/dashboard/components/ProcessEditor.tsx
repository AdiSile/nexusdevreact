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
import type { ProcessStep } from "../../../../lib/types";

/* ═══════════════════════════════════════════════════════════════════════════
   ProcessEditor – CRUD complet pentru pașii procesului de lucru
   Suportă: listare, adăugare, editare, ștergere, reordonare (sus/jos),
   iconițe, durată, livrabile, unelte și highlight color.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────
   Tipuri locale
   ───────────────────────────────────────────────────────── */

interface ProcessFormData {
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
  duration: string;
  deliverables: string[];
  tools: string[];
  highlightColor: string;
}

interface FormErrors {
  [field: string]: string;
}

/* ─────────────────────────────────────────────────────────
   Constante
   ───────────────────────────────────────────────────────── */

const AVAILABLE_ICONS: { value: string; label: string }[] = [
  { value: "fa-compass", label: "Busolă (Descoperire)" },
  { value: "fa-pencil", label: "Creion (Design)" },
  { value: "fa-code", label: "Cod (Dezvoltare)" },
  { value: "fa-vial", label: "Testare" },
  { value: "fa-rocket", label: "Rachetă (Lansare)" },
  { value: "fa-lightbulb", label: "Bec (Idee)" },
  { value: "fa-magnifying-glass", label: "Lupă (Cercetare)" },
  { value: "fa-paint-brush", label: "Pensulă (Design)" },
  { value: "fa-gears", label: "Angrenaje (Construcție)" },
  { value: "fa-shield-halved", label: "Scut (Securitate)" },
  { value: "fa-cloud-arrow-up", label: "Cloud Upload (Deploy)" },
  { value: "fa-comments", label: "Feedback" },
  { value: "fa-chart-line", label: "Grafic (Analiză)" },
  { value: "fa-wrench", label: "Cheie (Optimizare)" },
  { value: "fa-handshake", label: "Colaborare" },
  { value: "fa-clipboard-check", label: "Checklist" },
  { value: "fa-brain", label: "Brain (Strategie)" },
  { value: "fa-puzzle-piece", label: "Puzzle (Integrare)" },
  { value: "fa-bullseye", label: "Țintă (Obiective)" },
  { value: "fa-layer-group", label: "Layer (Arhitectură)" },
];

const HIGHLIGHT_COLORS: { value: string; label: string; color: string }[] = [
  { value: "#6C3CE1", label: "Violet Nexus", color: "bg-[#6C3CE1]" },
  { value: "#D4AF37", label: "Gold", color: "bg-[#D4AF37]" },
  { value: "#3B82F6", label: "Albastru", color: "bg-[#3B82F6]" },
  { value: "#10B981", label: "Verde Emerald", color: "bg-[#10B981]" },
  { value: "#F59E0B", label: "Amber", color: "bg-[#F59E0B]" },
  { value: "#EF4444", label: "Roșu", color: "bg-[#EF4444]" },
  { value: "#EC4899", label: "Roz", color: "bg-[#EC4899]" },
  { value: "#8B5CF6", label: "Purple", color: "bg-[#8B5CF6]" },
  { value: "#06B6D4", label: "Cyan", color: "bg-[#06B6D4]" },
  { value: "#F97316", label: "Orange", color: "bg-[#F97316]" },
];

/* ─────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────── */

function generateId(): string {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyFormData(): ProcessFormData {
  return {
    title: "",
    description: "",
    icon: "fa-compass",
    imageUrl: "",
    duration: "",
    deliverables: [],
    tools: [],
    highlightColor: "#6C3CE1",
  };
}

function processStepToFormData(step: ProcessStep): ProcessFormData {
  return {
    title: step.title,
    description: step.description,
    icon: step.icon ?? "fa-compass",
    imageUrl: step.imageUrl ?? "",
    duration: step.duration ?? "",
    deliverables: step.deliverables ? [...step.deliverables] : [],
    tools: step.tools ? [...step.tools] : [],
    highlightColor: step.highlightColor ?? "#6C3CE1",
  };
}

function formDataToProcessStep(
  form: ProcessFormData,
  existing?: ProcessStep,
): ProcessStep {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? generateId(),
    stepNumber: existing?.stepNumber ?? 0,
    title: form.title.trim(),
    description: form.description.trim(),
    icon: form.icon || undefined,
    imageUrl: form.imageUrl.trim() || undefined,
    duration: form.duration.trim() || undefined,
    deliverables:
      form.deliverables.filter((d) => d.trim()).length > 0
        ? form.deliverables.filter((d) => d.trim())
        : undefined,
    tools:
      form.tools.filter((t) => t.trim()).length > 0
        ? form.tools.filter((t) => t.trim())
        : undefined,
    highlightColor:
      form.highlightColor && form.highlightColor !== "#6C3CE1"
        ? form.highlightColor
        : undefined,
  };
}

/* ═════════════════════════════════════════════════════════
   Componenta principală
   ═════════════════════════════════════════════════════════ */

export interface ProcessEditorProps {
  steps: readonly ProcessStep[];
  onSave: (steps: ProcessStep[]) => void;
  onDirty: () => void;
  saving: boolean;
}

export default function ProcessEditor({
  steps: initialSteps,
  onSave,
  onDirty,
  saving,
}: ProcessEditorProps) {
  const [steps, setSteps] = useState<ProcessStep[]>(() =>
    [...initialSteps].sort((a, b) => a.stepNumber - b.stepNumber),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ProcessFormData>(emptyFormData());
  const [errors, setErrors] = useState<FormErrors>({});
  const [isNewStep, setIsNewStep] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deliverableInput, setDeliverableInput] = useState("");
  const [toolInput, setToolInput] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSteps([...initialSteps].sort((a, b) => a.stepNumber - b.stepNumber));
  }, [initialSteps]);

  const selectedStep = useMemo(
    () => steps.find((s) => s.id === selectedId) ?? null,
    [steps, selectedId],
  );

  const stats = useMemo(() => {
    const total = steps.length;
    const withDuration = steps.filter((s) => s.duration).length;
    const withDeliverables = steps.filter(
      (s) => s.deliverables && s.deliverables.length > 0,
    ).length;
    return { total, withDuration, withDeliverables };
  }, [steps]);

  const selectStep = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      setIsNewStep(false);
      setErrors({});
      if (id) {
        const step = steps.find((s) => s.id === id);
        if (step) setForm(processStepToFormData(step));
      } else {
        setForm(emptyFormData());
      }
    },
    [steps],
  );

  const startNewStep = useCallback(() => {
    setSelectedId(null);
    setIsNewStep(true);
    setErrors({});
    setForm(emptyFormData());
  }, []);

  const update = useCallback(
    (field: string, value: string) => {
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

  const addDeliverable = useCallback(() => {
    const val = deliverableInput.trim();
    if (!val) return;
    setForm((prev) => ({ ...prev, deliverables: [...prev.deliverables, val] }));
    setDeliverableInput("");
    onDirty();
  }, [deliverableInput, onDirty]);

  const removeDeliverable = useCallback(
    (idx: number) => {
      setForm((prev) => ({
        ...prev,
        deliverables: prev.deliverables.filter((_, i) => i !== idx),
      }));
      onDirty();
    },
    [onDirty],
  );

  const addTool = useCallback(() => {
    const val = toolInput.trim();
    if (!val) return;
    setForm((prev) => ({ ...prev, tools: [...prev.tools, val] }));
    setToolInput("");
    onDirty();
  }, [toolInput, onDirty]);

  const removeTool = useCallback(
    (idx: number) => {
      setForm((prev) => ({
        ...prev,
        tools: prev.tools.filter((_, i) => i !== idx),
      }));
      onDirty();
    },
    [onDirty],
  );

  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};
    if (!form.title.trim()) errs.title = "Titlul pasului este obligatoriu.";
    else if (form.title.trim().length < 3)
      errs.title = "Titlul trebuie să aibă cel puțin 3 caractere.";
    if (!form.description.trim()) errs.description = "Descrierea este obligatorie.";
    else if (form.description.trim().length < 10)
      errs.description = "Descrierea trebuie să aibă cel puțin 10 caractere.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const saveCurrent = useCallback(() => {
    if (!validate()) return;
    const saved = formDataToProcessStep(form, selectedStep ?? undefined);
    setSteps((prev) => {
      if (isNewStep || !selectedId) {
        saved.stepNumber = prev.length > 0
          ? Math.max(...prev.map((s) => s.stepNumber)) + 1
          : 1;
        return [...prev, saved];
      }
      return prev.map((s) =>
        s.id === selectedId
          ? { ...s, ...saved, id: s.id, stepNumber: s.stepNumber }
          : s,
      );
    });
    setSelectedId(saved.id);
    setIsNewStep(false);
    setErrors({});
  }, [form, validate, selectedStep, selectedId, isNewStep]);

  const deleteStep = useCallback(
    (id: string) => {
      setSteps((prev) => {
        const filtered = prev.filter((s) => s.id !== id);
        return filtered.map((s, i) => ({ ...s, stepNumber: i + 1 }));
      });
      if (selectedId === id) {
        setSelectedId(null);
        setIsNewStep(false);
        setForm(emptyFormData());
      }
      setShowDeleteConfirm(null);
      onDirty();
    },
    [selectedId, onDirty],
  );

  const moveStep = useCallback(
    (id: string, direction: "up" | "down") => {
      setSteps((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        if (idx === -1) return prev;
        const target = direction === "up" ? idx - 1 : idx + 1;
        if (target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        const tmpNumber = next[idx].stepNumber;
        next[idx] = { ...next[idx], stepNumber: next[target].stepNumber };
        next[target] = { ...next[target], stepNumber: tmpNumber };
        [next[idx], next[target]] = [next[target], next[idx]];
        return next;
      });
      onDirty();
    },
    [onDirty],
  );

  const handleSaveAll = useCallback(() => {
    const ordered = steps.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    onSave(ordered);
  }, [steps, onSave]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (selectedId || isNewStep) saveCurrent();
        else handleSaveAll();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        saveCurrent();
      }
    },
    [selectedId, isNewStep, saveCurrent, handleSaveAll],
  );

  const inputClass = (field: string) =>
    `w-full bg-white/[0.04] border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 
     outline-none transition-all duration-200 font-sans ${
       errors[field]
         ? "border-red-400/60 focus:border-red-400/70 focus:ring-1 focus:ring-red-400/20"
         : "border-glass-border focus:border-nexus-glow/40 focus:ring-1 focus:ring-nexus-glow/10 hover:border-glass-border-strong"
     }`;

  const selectedIconDef = AVAILABLE_ICONS.find((ic) => ic.value === form.icon);

  return (
    <div className="flex flex-col xl:flex-row gap-6" onKeyDown={handleKeyDown}>
      {/* ═══ LISTA DE PAȘI – Stânga ═══ */}
      <div className="w-full xl:w-[380px] flex-shrink-0">
        <div className="sticky top-24 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-diagram-project text-[10px] text-nexus-glow/60" />
              Pași proces
              <span className="text-white/25 font-mono text-[10px]">{stats.total}</span>
            </h3>
            <button
              type="button"
              onClick={startNewStep}
              className="flex items-center gap-1.5 text-[11px] font-medium text-nexus-glow bg-nexus-accent/15 hover:bg-nexus-accent/25 border border-nexus-accent/25 hover:border-nexus-accent/40 rounded-full px-3 py-1.5 transition-all duration-200"
            >
              <i className="fa-solid fa-plus text-[9px]" />
              Adaugă pas
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-glass-border bg-white/[0.02] p-3 text-center">
              <p className="text-lg font-bold text-white">{stats.total}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">Total</p>
            </div>
            <div className="rounded-xl border border-glass-border bg-white/[0.02] p-3 text-center">
              <p className="text-lg font-bold text-nexus-glow">{stats.withDuration}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">Cu durată</p>
            </div>
            <div className="rounded-xl border border-glass-border bg-white/[0.02] p-3 text-center">
              <p className="text-lg font-bold text-gold">{stats.withDeliverables}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">Cu livrabile</p>
            </div>
          </div>

          <div className="space-y-1 max-h-[55vh] overflow-y-auto scrollbar-thin">
            <AnimatePresence initial={false}>
              {steps.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                  <i className="fa-solid fa-diagram-project text-2xl text-white/10 block mb-2" />
                  <p className="text-xs text-white/25">Niciun pas adăugat.</p>
                  <p className="text-[10px] text-white/15 mt-1 font-mono">
                    Adaugă primul pas al procesului.
                  </p>
                </motion.div>
              ) : (
                steps.map((step, idx) => {
                  const isSelected = selectedId === step.id;
                  return (
                    <motion.div
                      key={step.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group ${
                          isSelected
                            ? "bg-nexus-accent/15 border border-nexus-accent/30"
                            : "bg-white/[0.02] border border-transparent hover:border-glass-border hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="relative flex-shrink-0 cursor-pointer" onClick={() => selectStep(step.id)}>
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                              isSelected
                                ? "bg-nexus-accent/25 text-nexus-glow"
                                : "bg-white/5 text-white/40 group-hover:text-white/60"
                            }`}
                            style={step.highlightColor && !isSelected ? { borderColor: step.highlightColor + "40", borderWidth: "1px" } : {}}
                          >
                            {String(step.stepNumber).padStart(2, "0")}
                          </div>
                          {step.highlightColor && (
                            <span
                              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white/10"
                              style={{ backgroundColor: step.highlightColor }}
                            />
                          )}
                        </div>
                        <button onClick={() => selectStep(step.id)} className="flex-1 min-w-0 text-left">
                          <span className={`text-sm font-medium truncate block ${isSelected ? "text-white" : "text-white/70"}`}>
                            {step.title}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {step.icon && (
                              <span className="text-[9px] text-white/20 flex items-center gap-1">
                                <i className={`fa-solid ${step.icon} text-[8px]`} />
                                {AVAILABLE_ICONS.find((ic) => ic.value === step.icon)?.label.split(" ")[0]}
                              </span>
                            )}
                            {step.duration && (
                              <span className="text-[9px] text-white/25 font-mono flex items-center gap-1">
                                <i className="fa-regular fa-clock text-[7px]" />{step.duration}
                              </span>
                            )}
                            {step.deliverables && step.deliverables.length > 0 && (
                              <span className="text-[9px] text-gold/60 font-mono">
                                {step.deliverables.length} livrabil{step.deliverables.length !== 1 ? "e" : ""}
                              </span>
                            )}
                          </div>
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveStep(step.id, "up"); }}
                            disabled={idx === 0}
                            className="p-1 rounded text-white/20 hover:text-white/60 disabled:opacity-20"
                            title="Mută în sus"
                          >
                            <i className="fa-solid fa-chevron-up text-[10px]" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveStep(step.id, "down"); }}
                            disabled={idx === steps.length - 1}
                            className="p-1 rounded text-white/20 hover:text-white/60 disabled:opacity-20"
                            title="Mută în jos"
                          >
                            <i className="fa-solid fa-chevron-down text-[10px]" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(step.id); }}
                            className="p-1 rounded text-white/15 hover:text-red-400/60 transition-colors"
                            title="Șterge pasul"
                          >
                            <i className="fa-solid fa-trash-can text-[9px]" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>

          <div className="rounded-xl border border-glass-border bg-white/[0.02] p-4">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">
              <i className="fa-solid fa-lightbulb text-gold/50 mr-1.5" />Sfaturi
            </p>
            <ul className="space-y-2 text-[11px] text-white/40 leading-relaxed">
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                Pașii se ordonează automat după stepNumber. Folosește săgețile pentru reordonare.
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                Adaugă livrabile clare — ajută clienții să înțeleagă ce primesc la fiecare etapă.
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-circle-check text-[8px] text-emerald-500/60 mt-1 flex-shrink-0" />
                O durată estimată crește încrederea și transparența.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ═══ EDITOR / FORMULAR – Dreapta ═══ */}
      <div className="flex-1 min-w-0" ref={formRef}>
        {!selectedId && !isNewStep ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-glass-border flex items-center justify-center mb-5">
              <i className="fa-solid fa-diagram-project text-2xl text-white/15" />
            </div>
            <h3 className="text-lg font-heading font-bold text-white/40 mb-2">Editor Proces</h3>
            <p className="text-sm text-white/25 max-w-md leading-relaxed mb-6">
              Selectează un pas din listă pentru a-l edita sau creează unul nou.
            </p>
            <button type="button" onClick={startNewStep} className="glass-btn text-sm px-6 py-2.5">
              <i className="fa-solid fa-plus text-xs" />
              <span>Pas nou</span>
            </button>
            {steps.length === 0 && (
              <p className="text-[10px] text-white/15 mt-4 font-mono">
                Nu există pași configurați. Procesul nu va fi afișat pe site.
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
                    {isNewStep ? "Pas nou" : "Editare pas"}
                  </h3>
                  {Object.keys(errors).length > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-red-400/80 bg-red-500/10 border border-red-400/20 rounded-full px-2.5 py-0.5">
                      <i className="fa-solid fa-triangle-exclamation text-[9px]" />
                      {Object.keys(errors).length} erori
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isNewStep && selectedId && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(selectedId)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-red-400/70 hover:text-red-400 bg-red-500/8 hover:bg-red-500/15 border border-red-400/15 rounded-full px-3 py-1.5 transition-all duration-200"
                    >
                      <i className="fa-solid fa-trash-can text-[9px]" />Șterge
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={saveCurrent}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400/80 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/20 rounded-full px-3 py-1.5 transition-all duration-200"
                  >
                    <i className="fa-solid fa-check text-[9px]" />
                    {isNewStep ? "Adaugă în listă" : "Actualizează"}
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
                        Ești sigur că vrei să ștergi acest pas? Acțiunea este ireversibilă.
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setShowDeleteConfirm(null)} className="text-xs text-white/40 hover:text-white/70 px-3 py-1.5">
                          Anulează
                        </button>
                        <button type="button" onClick={() => deleteStep(showDeleteConfirm)} className="text-xs font-medium text-red-400 bg-red-500/15 border border-red-400/25 rounded-lg px-4 py-1.5">
                          Șterge definitiv
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Informații de bază */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-circle-info text-[10px] text-nexus-glow/60" />
                  Informații de bază
                </legend>

                <Field label="Titlu pas" field="step-title" error={errors.title} required>
                  <input id="step-title" type="text" value={form.title} onChange={(e) => update("title", e.target.value)}
                    placeholder="Descoperire & Strategie" className={inputClass("title")}
                    aria-required="true" aria-invalid={!!errors.title} />
                  <CharCount current={form.title.length} max={80} />
                </Field>

                <Field label="Descriere" field="step-desc" error={errors.description} required>
                  <textarea id="step-desc" rows={3} value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Descrierea detaliată a ceea ce se întâmplă în acest pas..."
                    className={inputClass("description")} aria-required="true" aria-invalid={!!errors.description} />
                  <CharCount current={form.description.length} max={300} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Iconiță" field="step-icon">
                    <div className="relative">
                      <select id="step-icon" value={form.icon} onChange={(e) => update("icon", e.target.value)}
                        className={`${inputClass("icon")} appearance-none pr-10`}>
                        {AVAILABLE_ICONS.map((ic) => (
                          <option key={ic.value} value={ic.value}>{ic.label}</option>
                        ))}
                      </select>
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                        <i className={`fa-solid ${form.icon} text-sm`} />
                      </span>
                    </div>
                  </Field>

                  <Field label="Durată estimată (opțional)" field="step-duration">
                    <input id="step-duration" type="text" value={form.duration}
                      onChange={(e) => update("duration", e.target.value)}
                      placeholder="ex: 1-2 săptămâni" className={inputClass("duration")} />
                  </Field>
                </div>

                <Field label="Culoare accent (opțional)" field="step-color">
                  <div className="flex flex-wrap gap-2">
                    {HIGHLIGHT_COLORS.map((hc) => (
                      <button key={hc.value} type="button"
                        onClick={() => update("highlightColor", hc.value)}
                        className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${hc.color} ${
                          form.highlightColor === hc.value
                            ? "border-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                            : "border-transparent hover:scale-105 hover:border-white/30"
                        }`}
                        title={hc.label} aria-label={hc.label}
                        aria-pressed={form.highlightColor === hc.value} />
                    ))}
                    <button type="button" onClick={() => update("highlightColor", "#6C3CE1")}
                      className="w-8 h-8 rounded-full border border-white/10 bg-transparent flex items-center justify-center text-white/25 hover:text-white/60 transition-colors"
                      title="Resetează la culoarea implicită">
                      <i className="fa-solid fa-rotate-left text-[9px]" />
                    </button>
                  </div>
                </Field>

                <Field label="URL imagine (opțional)" field="step-image">
                  <input id="step-image" type="text" value={form.imageUrl}
                    onChange={(e) => update("imageUrl", e.target.value)}
                    placeholder="/images/process/discovery.jpg" className={inputClass("imageUrl")} />
                  <p className="text-[10px] text-white/25 mt-1.5 font-mono">Imagine decorativă asociată pasului.</p>
                </Field>
              </fieldset>

              {/* Livrabile */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-box-archive text-[10px] text-nexus-glow/60" />
                  Livrabile (opțional)
                </legend>
                <div className="flex items-center gap-2">
                  <input type="text" value={deliverableInput}
                    onChange={(e) => setDeliverableInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDeliverable(); } }}
                    placeholder="Adaugă un livrabil (ex: Document de strategie)..."
                    className={inputClass("deliverable-input")} />
                  <button type="button" onClick={addDeliverable}
                    className="p-2.5 rounded-xl bg-white/[0.04] border border-glass-border text-white/40 hover:text-white/70 hover:border-glass-border-strong transition-all">
                    <i className="fa-solid fa-plus text-xs" />
                  </button>
                </div>
                {form.deliverables.length > 0 && (
                  <div className="space-y-1.5">
                    <AnimatePresence initial={false}>
                      {form.deliverables.map((d, idx) => (
                        <motion.div key={`${d}-${idx}`} initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-2">
                          <i className="fa-solid fa-circle-check text-[8px] text-emerald-400/40 flex-shrink-0" />
                          <span className="flex-1 text-sm text-white/60 bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-1.5">{d}</span>
                          <button type="button" onClick={() => removeDeliverable(idx)}
                            className="p-1.5 text-white/15 hover:text-red-400/60 transition-colors">
                            <i className="fa-solid fa-xmark text-xs" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </fieldset>

              {/* Unelte & Tehnologii */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-screwdriver-wrench text-[10px] text-nexus-glow/60" />
                  Unelte & Tehnologii (opțional)
                </legend>
                <div className="flex items-center gap-2">
                  <input type="text" value={toolInput} onChange={(e) => setToolInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTool(); } }}
                    placeholder="Adaugă o tehnologie (ex: React, Figma)..."
                    className={inputClass("tool-input")} />
                  <button type="button" onClick={addTool}
                    className="p-2.5 rounded-xl bg-white/[0.04] border border-glass-border text-white/40 hover:text-white/70 hover:border-glass-border-strong transition-all">
                    <i className="fa-solid fa-plus text-xs" />
                  </button>
                </div>
                {form.tools.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence initial={false}>
                      {form.tools.map((tool, idx) => (
                        <motion.span key={`${tool}-${idx}`} initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                          className="inline-flex items-center gap-1.5 text-[11px] text-white/60 bg-white/[0.05] border border-white/[0.08] rounded-full pl-3 pr-1.5 py-1">
                          {tool}
                          <button type="button" onClick={() => removeTool(idx)}
                            className="p-0.5 rounded-full text-white/20 hover:text-red-400/60 transition-colors">
                            <i className="fa-solid fa-xmark text-[9px]" />
                          </button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </fieldset>

              {/* Previzualizare pas */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-eye text-[10px] text-nexus-glow/60" />
                  Previzualizare pas
                </legend>
                <div className="rounded-glass-lg border border-glass-border bg-white/[0.01] p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-nexus-accent/20 border-2 border-nexus-accent/30 text-nexus-glow"
                        style={form.highlightColor && form.highlightColor !== "#6C3CE1"
                          ? { borderColor: form.highlightColor + "60", backgroundColor: form.highlightColor + "1A", color: form.highlightColor }
                          : {}}>
                        {selectedStep ? String(selectedStep.stepNumber).padStart(2, "0") : "??"}
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-gold/10 border border-gold/15 flex items-center justify-center">
                        <i className={`fa-solid ${form.icon} text-[10px] text-gold-light`} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-white font-heading font-bold text-base sm:text-lg">
                        {form.title.trim() || "Titlu pas"}
                      </h4>
                      <p className="text-xs sm:text-sm text-white/45 mt-2 leading-relaxed">
                        {form.description.trim() || "Descrierea pasului..."}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-3">
                        {form.duration.trim() && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] text-white/35 font-mono">
                            <i className="fa-regular fa-clock text-[9px] text-nexus-glow/50" />{form.duration}
                          </span>
                        )}
                        {form.deliverables.length > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] text-white/35 font-mono">
                            <i className="fa-solid fa-box-archive text-[9px] text-gold/50" />
                            {form.deliverables.length} livrabil{form.deliverables.length !== 1 ? "e" : ""}
                          </span>
                        )}
                        {selectedIconDef && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] text-white/25">
                            <i className={`fa-solid ${form.icon} text-[9px]`} />{selectedIconDef.label.split(" ")[0]}
                          </span>
                        )}
                      </div>
                      {form.deliverables.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-1">
                          {form.deliverables.slice(0, 3).map((d, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px] text-white/50">
                              <i className="fa-solid fa-circle-check text-[8px] text-emerald-400/50 flex-shrink-0" />{d}
                            </div>
                          ))}
                          {form.deliverables.length > 3 && (
                            <p className="text-[10px] text-white/20 ml-4">+{form.deliverables.length - 3} alte livrabile</p>
                          )}
                        </div>
                      )}
                      {form.tools.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/[0.04]">
                          <div className="flex flex-wrap gap-1.5">
                            {form.tools.map((t, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full bg-white/[0.04] text-[10px] text-white/30 font-medium border border-white/[0.06]">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </fieldset>

              <SubmitButton saving={saving} hasErrors={Object.keys(errors).length > 0}
                hasChanges={isNewStep || (selectedStep !== null && JSON.stringify(formDataToProcessStep(form)) !== JSON.stringify(processStepToFormData(selectedStep)))}
                stepCount={steps.length} onSaveAll={handleSaveAll} />
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

function Field({ label, field, error, required = false, children }: {
  label: string; field: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  const errorId = `${field}-err`;
  return (
    <div>
      <label htmlFor={field} className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">
        {label}{required && <span className="text-red-400/70 ml-0.5" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-400/80 flex items-center gap-1.5">
          <i className="fa-solid fa-circle-exclamation text-[10px]" />{error}
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
        <div className={`h-full rounded-full transition-all duration-300 ${isOver ? "bg-red-400/60" : isWarning ? "bg-amber-400/60" : "bg-nexus-glow/50"}`}
          style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
      </div>
      <span className={`text-[10px] font-mono tabular-nums ${isOver ? "text-red-400/70" : isWarning ? "text-amber-400/60" : "text-white/25"}`} aria-live="polite">
        {current}/{max}{isOver && " — depășit"}
      </span>
    </div>
  );
}

function SubmitButton({ saving, hasErrors, hasChanges, stepCount, onSaveAll }: {
  saving: boolean; hasErrors: boolean; hasChanges: boolean; stepCount: number; onSaveAll: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-glass-border">
      <button type="button" onClick={onSaveAll} disabled={saving || hasErrors || stepCount === 0}
        className="glass-btn text-sm px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        aria-busy={saving}>
        {saving ? (
          <><span className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white animate-spin" aria-hidden="true" />
            <span>Se salvează...</span></>
        ) : (
          <><i className="fa-solid fa-floppy-disk text-xs" />
            <span>Salvează toți pașii ({stepCount})</span></>
        )}
      </button>
      <div className="flex items-center gap-3">
        {!saving && (
          <span className="text-[10px] text-white/20 font-mono hidden sm:inline">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[9px]">Ctrl+S</kbd>{"  "}salvează
          </span>
        )}
        {hasErrors && (
          <span className="text-[10px] text-red-400/50 font-mono flex items-center gap-1">
            <i className="fa-solid fa-circle-exclamation text-[9px]" />Verifică câmpurile
          </span>
        )}
        {!hasErrors && hasChanges && !saving && (
          <span className="w-2 h-2 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.5)] flex-shrink-0" title="Modificări nesalvate" />
        )}
      </div>
    </div>
  );
}

export type { ProcessFormData, FormErrors };
export { AVAILABLE_ICONS, HIGHLIGHT_COLORS };