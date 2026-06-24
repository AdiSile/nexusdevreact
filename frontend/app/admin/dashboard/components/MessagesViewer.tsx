"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ContactMessage, ContactMessageStatus } from "../../../../lib/types";

/* ═══════════════════════════════════════════════════════════════════════════
   MessagesViewer – Vizualizator mesaje primite prin formularul de contact
   Suportă: listare, filtrare, căutare, vizualizare detalii,
   schimbare status, ștergere, acțiuni în masă.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────
   Constante
   ───────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  ContactMessageStatus,
  { label: string; icon: string; color: string; bg: string; border: string }
> = {
  new: {
    label: "Nou",
    icon: "fa-circle",
    color: "text-blue-400",
    bg: "bg-blue-500/15",
    border: "border-blue-400/25",
  },
  read: {
    label: "Citit",
    icon: "fa-envelope-open",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-400/20",
  },
  replied: {
    label: "Răspuns",
    icon: "fa-reply",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-400/20",
  },
  archived: {
    label: "Arhivat",
    icon: "fa-box-archive",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-400/20",
  },
  spam: {
    label: "Spam",
    icon: "fa-shield-halved",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-400/20",
  },
};

const STATUS_ORDER: ContactMessageStatus[] = [
  "new",
  "read",
  "replied",
  "archived",
  "spam",
];

/* ─────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatRelativeDate(iso: string): string {
  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Acum";
    if (diffMin < 60) return `acum ${diffMin} min`;
    if (diffHrs < 24) return `acum ${diffHrs} h`;
    if (diffDays === 1) return "ieri";
    if (diffDays < 7) return `acum ${diffDays} zile`;
    return formatDate(iso);
  } catch {
    return iso;
  }
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="bg-gold/25 text-gold-light rounded-sm px-0.5"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/* ═════════════════════════════════════════════════════════
   Componenta principală
   ═════════════════════════════════════════════════════════ */

export interface MessagesViewerProps {
  /** Lista curentă de mesaje */
  messages: readonly ContactMessage[];
  /** Callback la schimbarea statusului unui mesaj */
  onStatusChange: (messageId: string, newStatus: ContactMessageStatus) => void;
  /** Callback ștergere mesaj */
  onDelete: (messageId: string) => void;
  /** Callback ștergere în masă */
  onBulkDelete: (messageIds: string[]) => void;
  /** Callback marcare în masă ca citit */
  onBulkMarkRead: (messageIds: string[]) => void;
  /** Callback dirty */
  onDirty: () => void;
  /** Stare salvare */
  saving: boolean;
}

export default function MessagesViewer({
  messages: initialMessages,
  onStatusChange,
  onDelete,
  onBulkDelete,
  onBulkMarkRead,
  onDirty,
  saving,
}: MessagesViewerProps) {
  /* ── Stare principală ── */
  const [messages, setMessages] = useState<ContactMessage[]>(() =>
    [...initialMessages].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactMessageStatus | "all">("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const detailRef = useRef<HTMLDivElement>(null);

  /* ── Sincronizare date externe ── */
  useEffect(() => {
    setMessages(
      [...initialMessages].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    );
  }, [initialMessages]);

  /* ── Mesajul selectat ── */
  const selectedMessage = useMemo(
    () => messages.find((m) => m.id === selectedId) ?? null,
    [messages, selectedId],
  );

  /* ── Mesaje filtrate ── */
  const filteredMessages = useMemo(() => {
    let list = messages;

    if (statusFilter !== "all") {
      list = list.filter((m) => m.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.subject ?? "").toLowerCase().includes(q) ||
          m.message.toLowerCase().includes(q) ||
          (m.company ?? "").toLowerCase().includes(q),
      );
    }

    return list;
  }, [messages, statusFilter, searchQuery]);

  /* ── Statistici ── */
  const stats = useMemo(() => {
    const counts: Record<ContactMessageStatus, number> = {
      new: 0,
      read: 0,
      replied: 0,
      archived: 0,
      spam: 0,
    };
    messages.forEach((m) => {
      counts[m.status] = (counts[m.status] ?? 0) + 1;
    });
    return { ...counts, total: messages.length };
  }, [messages]);

  /* ── Selectează mesaj ── */
  const selectMessage = useCallback(
    (id: string | null) => {
      setSelectedId(id);

      // Auto-marchează ca citit dacă e nou
      if (id) {
        const msg = messages.find((m) => m.id === id);
        if (msg && msg.status === "new") {
          onStatusChange(id, "read");
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, status: "read" as ContactMessageStatus } : m)),
          );
        }
      }
    },
    [messages, onStatusChange],
  );

  /* ── Schimbă status ── */
  const changeStatus = useCallback(
    (id: string, newStatus: ContactMessageStatus) => {
      onStatusChange(id, newStatus);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m)),
      );
      onDirty();
    },
    [onStatusChange, onDirty],
  );

  /* ── Șterge mesaj ── */
  const deleteMessage = useCallback(
    (id: string) => {
      onDelete(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
      setShowDeleteConfirm(null);
      onDirty();
    },
    [selectedId, onDelete, onDirty],
  );

  /* ── Toggle selecție ── */
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) setSelectionMode(false);
      } else {
        next.add(id);
        setSelectionMode(true);
      }
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    const filteredIds = filteredMessages.map((m) => m.id);
    setSelectedIds(new Set(filteredIds));
    setSelectionMode(true);
  }, [filteredMessages]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  /* ── Acțiuni în masă ── */
  const handleBulkMarkRead = useCallback(() => {
    const ids = Array.from(selectedIds);
    onBulkMarkRead(ids);
    setMessages((prev) =>
      prev.map((m) =>
        ids.includes(m.id) ? { ...m, status: "read" as ContactMessageStatus } : m,
      ),
    );
    clearSelection();
    onDirty();
  }, [selectedIds, onBulkMarkRead, clearSelection, onDirty]);

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    onBulkDelete(ids);
    setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    if (selectedId && ids.includes(selectedId)) {
      setSelectedId(null);
    }
    clearSelection();
    onDirty();
  }, [selectedIds, onBulkDelete, clearSelection, selectedId, onDirty]);

  /* ── Keyboard shortcuts ── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Escape: deselectează
      if (e.key === "Escape") {
        if (selectionMode) {
          clearSelection();
        } else {
          setSelectedId(null);
        }
      }
    },
    [selectionMode, clearSelection],
  );

  /* ── Bulk action bar visibility ── */
  const showBulkBar = selectionMode && selectedIds.size > 0;

  /* ── Input class comun ── */
  const inputClass =
    "w-full bg-white/[0.04] border border-glass-border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 outline-none transition-all duration-200 font-sans focus:border-nexus-glow/40 focus:ring-1 focus:ring-nexus-glow/10 hover:border-glass-border-strong";

  /* ═════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col xl:flex-row gap-6" onKeyDown={handleKeyDown}>
      {/* ═════════════════════════════════════════
          LISTA DE MESAJE – Stânga
          ═════════════════════════════════════════ */}
      <div className="w-full xl:w-[400px] flex-shrink-0">
        <div className="sticky top-24 space-y-4">
          {/* Header cu statistici */}
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-envelope text-[10px] text-nexus-glow/60" />
              Mesaje
              <span className="text-white/25 font-mono text-[10px]">
                {stats.total}
              </span>
            </h3>

            {/* Selection mode toggle */}
            <button
              type="button"
              onClick={() => {
                if (selectionMode) {
                  clearSelection();
                } else {
                  setSelectionMode(true);
                }
              }}
              className={`flex items-center gap-1.5 text-[11px] font-medium rounded-full px-3 py-1.5 transition-all duration-200 ${
                selectionMode
                  ? "text-nexus-glow bg-nexus-accent/20 border border-nexus-accent/30"
                  : "text-white/35 border border-transparent hover:text-white/60 hover:bg-white/[0.03]"
              }`}
            >
              <i className={`fa-solid fa-check-double text-[9px]`} />
              {selectionMode ? `Selectate (${selectedIds.size})` : "Selectează"}
            </button>
          </div>

          {/* Statistici rapide */}
          <div className="grid grid-cols-5 gap-1.5">
            {STATUS_ORDER.map((status) => {
              const cfg = STATUS_CONFIG[status];
              const count = stats[status];
              return (
                <button
                  key={status}
                  onClick={() =>
                    setStatusFilter(
                      statusFilter === status ? "all" : status,
                    )
                  }
                  className={`rounded-xl border p-2.5 text-center transition-all duration-200 ${
                    statusFilter === status
                      ? `${cfg.bg} ${cfg.border}`
                      : "border-glass-border bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                  title={cfg.label}
                >
                  <p
                    className={`text-lg font-bold ${
                      statusFilter === status ? cfg.color : "text-white/40"
                    }`}
                  >
                    {count}
                  </p>
                  <p className="text-[8px] text-white/25 uppercase tracking-wider mt-0.5">
                    {cfg.label}
                  </p>
                </button>
              );
            })}
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
                placeholder="Caută mesaje..."
                className="w-full bg-white/[0.03] border border-glass-border rounded-xl pl-10 pr-10 py-2 text-white text-xs placeholder:text-white/15 outline-none focus:border-nexus-glow/30 transition-all duration-200"
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

            {/* Status filter pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setStatusFilter("all")}
                className={`text-[10px] font-medium rounded-full px-2.5 py-1 transition-all duration-200 ${
                  statusFilter === "all"
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-white/35 border border-transparent hover:text-white/60"
                }`}
              >
                Toate ({stats.total})
              </button>
              {STATUS_ORDER.map((status) => {
                const cfg = STATUS_CONFIG[status];
                const count = stats[status];
                if (count === 0 && statusFilter !== status) return null;
                return (
                  <button
                    key={status}
                    onClick={() =>
                      setStatusFilter(
                        statusFilter === status ? "all" : status,
                      )
                    }
                    className={`text-[10px] font-medium rounded-full px-2.5 py-1 transition-all duration-200 flex items-center gap-1 ${
                      statusFilter === status
                        ? `${cfg.bg} ${cfg.color} border ${cfg.border}`
                        : "text-white/35 border border-transparent hover:text-white/60"
                    }`}
                  >
                    <i className={`fa-solid ${cfg.icon} text-[7px]`} />
                    {cfg.label}
                    <span className="text-[9px] opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bulk actions bar */}
          <AnimatePresence>
            {showBulkBar && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-nexus-accent/25 bg-nexus-accent/8 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-nexus-glow/80">
                      {selectedIds.size} mesaj{selectedIds.size !== 1 ? "e" : ""} selectate
                    </span>
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="text-[9px] text-white/30 hover:text-white/60"
                    >
                      Selectează toate ({filteredMessages.length})
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBulkMarkRead}
                      disabled={saving}
                      className="flex items-center gap-1 text-[10px] font-medium text-sky-400/80 hover:text-sky-400 bg-sky-500/10 border border-sky-400/20 rounded-lg px-3 py-1.5 transition-all"
                    >
                      <i className="fa-solid fa-envelope-open text-[8px]" />
                      Marchează citite
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={saving}
                      className="flex items-center gap-1 text-[10px] font-medium text-red-400/80 hover:text-red-400 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-1.5 transition-all"
                    >
                      <i className="fa-solid fa-trash-can text-[8px]" />
                      Șterge
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lista mesaje */}
          <div className="space-y-1 max-h-[55vh] overflow-y-auto scrollbar-thin">
            <AnimatePresence initial={false}>
              {filteredMessages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-10"
                >
                  <i className="fa-solid fa-inbox text-2xl text-white/10 block mb-2" />
                  <p className="text-xs text-white/25">
                    {searchQuery || statusFilter !== "all"
                      ? "Niciun mesaj nu se potrivește filtrelor."
                      : "Niciun mesaj primit."}
                  </p>
                </motion.div>
              ) : (
                filteredMessages.map((msg) => {
                  const isSelected = selectedId === msg.id;
                  const isChecked = selectedIds.has(msg.id);
                  const cfg = STATUS_CONFIG[msg.status];
                  const isUnread = msg.status === "new";

                  return (
                    <motion.div
                      key={msg.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      {/* Selection checkbox (apare în mod selecție) */}
                      {selectionMode && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(msg.id);
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 z-10"
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              isChecked
                                ? "bg-nexus-accent/40 border-nexus-glow/50"
                                : "border-white/15 bg-white/[0.02]"
                            }`}
                          >
                            {isChecked && (
                              <i className="fa-solid fa-check text-[8px] text-white" />
                            )}
                          </div>
                        </button>
                      )}

                      <button
                        onClick={() =>
                          selectionMode
                            ? toggleSelection(msg.id)
                            : selectMessage(msg.id)
                        }
                        className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group ${
                          selectionMode ? (isChecked ? "pl-8" : "pl-8") : ""
                        } ${
                          isSelected
                            ? "bg-nexus-accent/15 border border-nexus-accent/30"
                            : "bg-white/[0.02] border border-transparent hover:border-glass-border hover:bg-white/[0.04]"
                        }`}
                      >
                        {/* Avatar + status dot */}
                        <div className="relative flex-shrink-0 mt-0.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                              isSelected
                                ? "bg-nexus-accent/25 text-nexus-glow"
                                : "bg-white/5 text-white/30 group-hover:text-white/50"
                            }`}
                          >
                            {msg.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          {isUnread && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-[#0B0A14]" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm truncate ${
                                isUnread
                                  ? "text-white font-semibold"
                                  : isSelected
                                    ? "text-white"
                                    : "text-white/70"
                              }`}
                            >
                              {msg.name}
                            </span>
                            {msg.company && (
                              <span className="text-[9px] text-white/20 truncate hidden sm:inline">
                                {msg.company}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[11px] mt-0.5 truncate ${
                              isUnread
                                ? "text-white/55 font-medium"
                                : "text-white/30"
                            }`}
                          >
                            {msg.subject || msg.message.slice(0, 80)}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className={`text-[9px] rounded-full px-1.5 py-0.5 border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                            >
                              {cfg.label}
                            </span>
                            <span className="text-[9px] text-white/20 font-mono">
                              {formatRelativeDate(msg.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Acțiuni rapide */}
                        {!selectionMode && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                changeStatus(
                                  msg.id,
                                  msg.status === "replied" ? "read" : "replied",
                                );
                              }}
                              className="p-1 rounded text-white/20 hover:text-emerald-400/70"
                              title={
                                msg.status === "replied"
                                  ? "Anulează răspuns"
                                  : "Marchează ca răspuns"
                              }
                            >
                              <i
                                className={`fa-solid fa-reply text-[10px] ${
                                  msg.status === "replied"
                                    ? "text-emerald-400/70"
                                    : ""
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteConfirm(msg.id);
                              }}
                              className="p-1 rounded text-white/15 hover:text-red-400/60"
                              title="Șterge"
                            >
                              <i className="fa-solid fa-trash-can text-[10px]" />
                            </button>
                          </div>
                        )}
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
          DETALII MESAJ – Dreapta
          ═════════════════════════════════════════ */}
      <div className="flex-1 min-w-0" ref={detailRef}>
        {!selectedMessage ? (
          /* Stare goală */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-glass-border flex items-center justify-center mb-5">
              <i className="fa-solid fa-envelope-open-text text-2xl text-white/15" />
            </div>
            <h3 className="text-lg font-heading font-bold text-white/40 mb-2">
              Vizualizator Mesaje
            </h3>
            <p className="text-sm text-white/25 max-w-md leading-relaxed mb-6">
              Selectează un mesaj din listă pentru a citi detaliile. Mesajele
              noi se marchează automat ca citite.
            </p>
            {messages.length === 0 && (
              <p className="text-[10px] text-white/15 mt-1 font-mono">
                Nu există mesaje în inbox.
              </p>
            )}
            {messages.length > 0 && filteredMessages.length === 0 && (
              <p className="text-[10px] text-white/20 mt-1 font-mono">
                Ajustează filtrele pentru a vedea mesajele.
              </p>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedMessage.id}
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
                    Detalii mesaj
                  </h3>
                  <span
                    className={`text-[10px] font-medium rounded-full px-2.5 py-0.5 border ${
                      STATUS_CONFIG[selectedMessage.status].bg
                    } ${STATUS_CONFIG[selectedMessage.status].color} ${
                      STATUS_CONFIG[selectedMessage.status].border
                    }`}
                  >
                    {STATUS_CONFIG[selectedMessage.status].label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status change buttons */}
                  <div className="flex items-center gap-1">
                    {STATUS_ORDER.filter(
                      (s) => s !== selectedMessage.status,
                    ).map((status) => {
                      const cfg = STATUS_CONFIG[status];
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            changeStatus(selectedMessage.id, status)
                          }
                          disabled={saving}
                          className={`flex items-center gap-1 text-[10px] font-medium rounded-lg px-2.5 py-1.5 transition-all duration-200 ${cfg.bg} ${cfg.color} border ${cfg.border} hover:opacity-80`}
                          title={`Marchează ca "${cfg.label}"`}
                        >
                          <i
                            className={`fa-solid ${cfg.icon} text-[8px]`}
                          />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(selectedMessage.id)}
                    className="flex items-center gap-1 text-[10px] font-medium text-red-400/70 hover:text-red-400 bg-red-500/8 hover:bg-red-500/15 border border-red-400/15 rounded-lg px-2.5 py-1.5 transition-all duration-200"
                  >
                    <i className="fa-solid fa-trash-can text-[8px]" />
                    Șterge
                  </button>
                </div>
              </div>

              {/* Confirmare ștergere */}
              <AnimatePresence>
                {showDeleteConfirm === selectedMessage.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-red-400/25 bg-red-500/[0.06] p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm text-red-300/80">
                        <i className="fa-solid fa-triangle-exclamation" />
                        Ești sigur că vrei să ștergi acest mesaj? Acțiunea este
                        ireversibilă.
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
                          onClick={() => deleteMessage(selectedMessage.id)}
                          className="text-xs font-medium text-red-400 bg-red-500/15 border border-red-400/25 rounded-lg px-4 py-1.5"
                        >
                          Șterge definitiv
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Card expeditor */}
              <div className="rounded-glass-lg border border-glass-border bg-white/[0.01] p-6 space-y-5">
                {/* Nume + avatar */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-nexus-accent/20 border border-nexus-accent/25 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-nexus-glow">
                      {selectedMessage.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-white font-heading font-bold text-base">
                      {highlightText(selectedMessage.name, searchQuery)}
                    </h4>
                    {selectedMessage.company && (
                      <p className="text-xs text-white/35 mt-0.5 flex items-center gap-1.5">
                        <i className="fa-solid fa-building text-[9px]" />
                        {highlightText(selectedMessage.company, searchQuery)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Grid detalii contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Email */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-glass-border">
                    <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-envelope text-xs text-gold-light" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-white/25 uppercase tracking-wider">
                        Email
                      </p>
                      <a
                        href={`mailto:${selectedMessage.email}`}
                        className="text-xs text-white/70 hover:text-gold-light transition-colors truncate block"
                      >
                        {highlightText(selectedMessage.email, searchQuery)}
                      </a>
                    </div>
                  </div>

                  {/* Telefon */}
                  {selectedMessage.phone && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-glass-border">
                      <div className="w-8 h-8 rounded-lg bg-nexus-accent/10 border border-nexus-accent/20 flex items-center justify-center flex-shrink-0">
                        <i className="fa-solid fa-phone text-xs text-nexus-glow" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-white/25 uppercase tracking-wider">
                          Telefon
                        </p>
                        <a
                          href={`tel:${selectedMessage.phone.replace(/\s/g, "")}`}
                          className="text-xs text-white/70 hover:text-gold-light transition-colors truncate block"
                        >
                          {selectedMessage.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Subiect */}
                  {selectedMessage.subject && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-glass-border sm:col-span-2">
                      <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                        <i className="fa-solid fa-tag text-xs text-gold-light" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-white/25 uppercase tracking-wider">
                          Subiect
                        </p>
                        <p className="text-xs text-white/80 font-medium">
                          {highlightText(selectedMessage.subject, searchQuery)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Buget & Timeline */}
                {(selectedMessage.budgetRange ||
                  selectedMessage.timeline) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedMessage.budgetRange && (
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <i className="fa-solid fa-coins text-[10px] text-gold/60" />
                        <span className="text-white/30">Buget:</span>
                        <span className="text-white/60 font-medium">
                          {selectedMessage.budgetRange}
                        </span>
                      </div>
                    )}
                    {selectedMessage.timeline && (
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <i className="fa-solid fa-clock text-[10px] text-nexus-glow/60" />
                        <span className="text-white/30">Termen:</span>
                        <span className="text-white/60 font-medium">
                          {selectedMessage.timeline}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Mesaj */}
                <div>
                  <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-message text-[9px] text-nexus-glow/60" />
                    Mesaj
                  </p>
                  <div className="rounded-xl bg-white/[0.02] border border-glass-border p-4">
                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap break-words">
                      {highlightText(selectedMessage.message, searchQuery)}
                    </p>
                  </div>
                </div>

                {/* Metadata footer */}
                <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-glass-border">
                  <div className="flex items-center gap-1.5 text-[10px] text-white/20 font-mono">
                    <i className="fa-solid fa-calendar text-[9px]" />
                    {formatDate(selectedMessage.createdAt)}
                  </div>
                  {selectedMessage.readAt && (
                    <div className="flex items-center gap-1.5 text-[10px] text-white/20 font-mono">
                      <i className="fa-solid fa-eye text-[9px]" />
                      Citit: {formatDate(selectedMessage.readAt)}
                    </div>
                  )}
                  {selectedMessage.repliedAt && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/50 font-mono">
                      <i className="fa-solid fa-reply text-[9px]" />
                      Răspuns: {formatDate(selectedMessage.repliedAt)}
                    </div>
                  )}
                </div>
              </div>

              {/* Acțiuni rapide footer */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject || "Mesajul tău")}&body=${encodeURIComponent(`Salut ${selectedMessage.name},\n\n`)}`}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-nexus-glow/80 hover:text-nexus-glow bg-nexus-accent/10 hover:bg-nexus-accent/20 border border-nexus-accent/20 rounded-lg px-4 py-2 transition-all duration-200"
                  >
                    <i className="fa-solid fa-reply text-[9px]" />
                    Răspunde prin email
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        selectedMessage.email,
                      );
                    }}
                    className="flex items-center gap-1.5 text-[10px] font-medium text-white/30 hover:text-white/60 bg-white/[0.02] border border-glass-border rounded-lg px-3 py-2 transition-all duration-200"
                  >
                    <i className="fa-solid fa-copy text-[9px]" />
                    Copiază email
                  </button>
                </div>

                <span className="text-[10px] text-white/15 font-mono">
                  ID: {selectedMessage.id}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   Exporturi denumite
   ═════════════════════════════════════════════════════════ */

export { STATUS_CONFIG, STATUS_ORDER, formatDate, formatRelativeDate };
export type { ContactMessageStatus };