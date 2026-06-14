"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  AlertTriangle,
  RefreshCw,
  Upload,
  Search,
  MoreHorizontal,
  Phone,
  PhoneMissed,
  PhoneForwarded,
  Send,
  CheckCircle2,
  ArrowUpRight,
  Car,
  FileText,
  X,
  Ban,
  Command,
  Moon,
  Sun,
  DollarSign,
  MessageSquare,
  Hash,
  ChevronRight,
  Layers,
} from "lucide-react";

import type { ContractRow } from "@/lib/supabase";
import { cn, formatAED } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type View = "command" | "contracts" | "upload";

interface DashboardStats {
  totalContracts: number;
  dueToCloseToday: number;
  overdue: number;
  notCalled: number;
  called: number;
  noAnswer: number;
  callback: number;
  whatsappNotSent: number;
  whatsappSent: number;
  whatsappReplied: number;
  actionNone: number;
  extended: number;
  returning: number;
  closed: number;
  immobilised: number;
  totalOutstanding: number;
  contractsWithOutstanding: number;
}

const emptyStats: DashboardStats = {
  totalContracts: 0, dueToCloseToday: 0, overdue: 0,
  notCalled: 0, called: 0, noAnswer: 0, callback: 0,
  whatsappNotSent: 0, whatsappSent: 0, whatsappReplied: 0,
  actionNone: 0, extended: 0, returning: 0, closed: 0, immobilised: 0,
  totalOutstanding: 0, contractsWithOutstanding: 0,
};

// ---------------------------------------------------------------------------
// Command Palette
// ---------------------------------------------------------------------------

function CommandPalette({ open, onClose, onCommand }: {
  open: boolean; onClose: () => void; onCommand: (cmd: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const commands = useMemo(() => [
    { id: "view-overdue", label: "View Overdue Contracts", icon: AlertTriangle, section: "Navigate" },
    { id: "view-due-today", label: "View Due Today", icon: Clock, section: "Navigate" },
    { id: "view-not-called", label: "View Not Called", icon: PhoneMissed, section: "Navigate" },
    { id: "view-wa-pending", label: "View WhatsApp Pending", icon: MessageSquare, section: "Navigate" },
    { id: "upload", label: "Upload Excel / CSV", icon: Upload, section: "Actions" },
    { id: "refresh", label: "Refresh Data", icon: RefreshCw, section: "Actions" },
    { id: "toggle-theme", label: "Toggle Dark Mode", icon: Moon, section: "Settings" },
  ], []);

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] cmd-backdrop flex items-start justify-center pt-[18vh]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-[520px] bg-white dark:bg-[#1A1D2E] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2D3348] overflow-hidden"
        initial={{ scale: 0.96, opacity: 0, y: -8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 h-12 border-b border-gray-100 dark:border-[#2D3348]">
          <Search className="w-[15px] h-[15px] text-gray-400" />
          <input
            ref={inputRef} type="text" value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-gray-400"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && filtered.length > 0) { onCommand(filtered[0].id); onClose(); }
            }}
          />
          <kbd className="text-[10px] text-gray-400 bg-gray-100 dark:bg-[#2D3348] px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>
        <div className="max-h-[280px] overflow-y-auto py-1">
          {filtered.length === 0 && <p className="text-center text-[13px] text-gray-400 py-8">No results</p>}
          {Object.entries(
            filtered.reduce((acc, cmd) => { (acc[cmd.section] = acc[cmd.section] || []).push(cmd); return acc; }, {} as Record<string, typeof commands>)
          ).map(([section, items]) => (
            <div key={section}>
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">{section}</p>
              {items.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => { onCommand(cmd.id); onClose(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] hover:bg-gray-50 dark:hover:bg-[#2D3348] transition-colors"
                >
                  <cmd.icon className="w-[14px] h-[14px] text-gray-400" />
                  {cmd.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function Badge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; text: string; dot?: string }> = {
    not_called: { label: "Not Called", bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400" },
    called: { label: "Called", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    no_answer: { label: "No Answer", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
    callback: { label: "Callback", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
    not_sent: { label: "Pending", bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400" },
    sent: { label: "Sent", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    replied: { label: "Replied", bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-400", dot: "bg-teal-500" },
    failed: { label: "Failed", bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
    none: { label: "Pending", bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400" },
    extended: { label: "Extended", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
    returning: { label: "Returning", bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-400", dot: "bg-violet-500" },
    closed: { label: "Closed", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    immobilised: { label: "Immobilised", bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
  };
  const c = map[status] || { label: status, bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-[3px] text-[11px] font-medium rounded-md", c.bg, c.text)}>
      {c.dot && <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />}
      {c.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Contract Row Actions Dropdown
// ---------------------------------------------------------------------------

function RowActions({ contract, onAction, onSendWA }: {
  contract: ContractRow;
  onAction: (id: string, action: string, value: string) => void;
  onSendWA: (c: ContractRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <>
      <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">{title}</p>
      {children}
    </>
  );

  const Item = ({ icon: Icon, label, color, onClick }: { icon: React.ElementType; label: string; color: string; onClick: () => void }) => (
    <button
      onClick={() => { onClick(); setOpen(false); }}
      className="w-full flex items-center gap-2 px-3 py-[7px] text-[13px] hover:bg-gray-50 dark:hover:bg-[#2D3348] transition-colors"
    >
      <Icon className={cn("w-[14px] h-[14px]", color)} />{label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4 text-gray-400" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.12 }}
            className="absolute right-0 top-8 z-50 w-52 bg-white dark:bg-[#1A1D2E] rounded-xl border border-gray-200 dark:border-[#2D3348] shadow-xl py-1 overflow-hidden"
          >
            <Section title="Call">
              <Item icon={Phone} label="Called" color="text-emerald-600" onClick={() => onAction(contract.id, "call_status", "called")} />
              <Item icon={PhoneMissed} label="No Answer" color="text-amber-600" onClick={() => onAction(contract.id, "call_status", "no_answer")} />
              <Item icon={PhoneForwarded} label="Callback" color="text-blue-600" onClick={() => onAction(contract.id, "call_status", "callback")} />
            </Section>
            <div className="h-px bg-gray-100 dark:bg-[#2D3348] my-1" />
            <Section title="WhatsApp">
              <Item icon={Send} label="Send Reminder" color="text-emerald-600" onClick={() => onSendWA(contract)} />
            </Section>
            <div className="h-px bg-gray-100 dark:bg-[#2D3348] my-1" />
            <Section title="Resolution">
              <Item icon={ArrowUpRight} label="Extended" color="text-blue-600" onClick={() => onAction(contract.id, "action_taken", "extended")} />
              <Item icon={Car} label="Returning" color="text-violet-600" onClick={() => onAction(contract.id, "action_taken", "returning")} />
              <Item icon={CheckCircle2} label="Closed" color="text-emerald-600" onClick={() => onAction(contract.id, "action_taken", "closed")} />
              <Item icon={Ban} label="Immobilised" color="text-red-600" onClick={() => onAction(contract.id, "action_taken", "immobilised")} />
            </Section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonDashboard() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-[88px] skeleton rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[180px] skeleton rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [view, setView] = useState<View>("command");
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [dark, setDark] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [callFilter, setCallFilter] = useState("all");
  const [whatsappFilter, setWhatsappFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("due_to_close_today");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen((v) => !v); }
      if (e.key === "Escape") setCmdOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg); setTimeout(() => setToast(null), 3000);
  }, []);

  // ---- Data ----
  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (callFilter !== "all") params.set("call_status", callFilter);
      if (whatsappFilter !== "all") params.set("whatsapp_status", whatsappFilter);
      if (actionFilter !== "all") params.set("action_taken", actionFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/contracts?${params}`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (data.error) { showToast(`Error: ${data.error}`); return; }
      setContracts(data.contracts || []);
      setStats(data.stats || emptyStats);
      setLastRefresh(new Date());
    } catch { /* DB not connected */ } finally { setIsLoading(false); }
  }, [categoryFilter, callFilter, whatsappFilter, actionFilter, searchQuery, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true); await fetchData(); setIsRefreshing(false); showToast("Data refreshed");
  }, [fetchData, showToast]);

  // ---- Actions ----
  const handleAction = useCallback(async (contractId: string, action: string, value: string) => {
    try {
      const res = await fetch("/api/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contractId, action, value }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setContracts((prev) => prev.map((c) => {
        if (c.id !== contractId) return c;
        const u = { ...c, last_updated: new Date().toISOString() };
        if (action === "call_status") u.call_status = value as ContractRow["call_status"];
        if (action === "whatsapp_status") u.whatsapp_status = value as ContractRow["whatsapp_status"];
        if (action === "action_taken") u.action_taken = value as ContractRow["action_taken"];
        if (action === "note") u.notes = value;
        return u;
      }));
      const labels: Record<string, string> = { called: "Marked Called", no_answer: "No Answer", callback: "Callback Set", sent: "WA Sent", replied: "WA Replied", extended: "Extended", returning: "Returning", closed: "Closed", immobilised: "Immobilised" };
      showToast(labels[value] || `${action}: ${value}`);
    } catch (err) { showToast(`Failed: ${err instanceof Error ? err.message : "Error"}`); }
  }, [showToast]);

  const handleSendWhatsApp = useCallback(async (contract: ContractRow) => {
    if (!contract.contact_number) { showToast("No phone number"); return; }
    try {
      const res = await fetch("/api/whatsapp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contractId: contract.id, phone: contract.contact_number, customerName: contract.customer_name || "Customer", templateName: "contract_reminder" }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setContracts((prev) => prev.map((c) => c.id === contract.id ? { ...c, whatsapp_status: "sent" as const, last_updated: new Date().toISOString() } : c));
      showToast("WhatsApp sent");
    } catch (err) { showToast(`WA failed: ${err instanceof Error ? err.message : "Error"}`); }
  }, [showToast]);

  // ---- Upload ----
  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("category", uploadCategory);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showToast(`${data.total} rows (${data.newRows} new, ${data.updatedRows} updated)`);
      await fetchData();
    } catch (err) { showToast(`Upload failed: ${err instanceof Error ? err.message : "Error"}`); }
    finally { setIsUploading(false); }
  }, [uploadCategory, showToast, fetchData]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) handleUpload(file); e.target.value = "";
  }, [handleUpload]);

  // ---- Filter helpers ----
  const applyFilter = useCallback((f: { category?: string; call?: string; whatsapp?: string; action?: string }) => {
    setCategoryFilter(f.category || "all"); setCallFilter(f.call || "all");
    setWhatsappFilter(f.whatsapp || "all"); setActionFilter(f.action || "all");
    setView("contracts");
  }, []);

  const clearFilters = useCallback(() => {
    setCategoryFilter("all"); setCallFilter("all"); setWhatsappFilter("all"); setActionFilter("all"); setSearchQuery("");
  }, []);

  const handleCommand = useCallback((cmd: string) => {
    switch (cmd) {
      case "view-overdue": applyFilter({ category: "over_due_closing" }); break;
      case "view-due-today": applyFilter({ category: "due_to_close_today" }); break;
      case "view-not-called": applyFilter({ call: "not_called" }); break;
      case "view-wa-pending": applyFilter({ whatsapp: "not_sent" }); break;
      case "upload": setView("upload"); break;
      case "refresh": handleRefresh(); break;
      case "toggle-theme": setDark((d) => !d); break;
    }
  }, [applyFilter, handleRefresh]);

  const hasActiveFilters = categoryFilter !== "all" || callFilter !== "all" || whatsappFilter !== "all" || actionFilter !== "all" || searchQuery !== "";

  const daysOverdue = (endDate: string | null): number => {
    if (!endDate) return 0;
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const e = new Date(endDate); e.setHours(0, 0, 0, 0);
    return Math.floor((t.getTime() - e.getTime()) / 86400000);
  };

  const actionRate = stats.totalContracts > 0 ? Math.round(((stats.extended + stats.returning + stats.closed + stats.immobilised) / stats.totalContracts) * 100) : 0;
  const contactRate = stats.totalContracts > 0 ? Math.round(((stats.called + stats.noAnswer + stats.callback) / stats.totalContracts) * 100) : 0;

  // ---- Render ----
  return (
    <div className={cn("min-h-screen", dark ? "bg-[#0F1117] text-gray-100" : "bg-[#FAFAFA] text-gray-900")}>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onCommand={handleCommand} />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 16, x: "-50%" }}
            className="fixed bottom-5 left-1/2 z-[200] px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[13px] font-medium rounded-xl shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Header ─── */}
      <header className={cn(
        "sticky top-0 z-50 backdrop-blur-xl border-b",
        dark ? "bg-[#0F1117]/80 border-[#1E2235]" : "bg-white/80 border-gray-200"
      )}>
        <div className="max-w-[1400px] mx-auto px-5 h-[52px] flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-[26px] h-[26px] rounded-md bg-[#1E2033] flex items-center justify-center">
                <Layers className="w-[14px] h-[14px] text-white" />
              </div>
              <span className="text-[14px] font-semibold tracking-[-0.01em]">Legend AR</span>
            </div>
            <nav className="hidden md:flex items-center">
              {(["command", "contracts", "upload"] as View[]).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1.5 text-[13px] font-medium rounded-md transition-all",
                    view === v
                      ? dark ? "bg-[#1E2235] text-white" : "bg-gray-100 text-gray-900"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  {v === "command" ? "Overview" : v === "contracts" ? "Contracts" : "Upload"}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCmdOpen(true)}
              className={cn(
                "hidden sm:flex items-center gap-2 px-2.5 py-[6px] text-[12px] rounded-lg border transition-colors",
                dark ? "border-[#2D3348] text-gray-400 hover:border-gray-600" : "border-gray-200 text-gray-500 hover:border-gray-300"
              )}
            >
              <Search className="w-3.5 h-3.5" />Search
              <kbd className={cn("text-[10px] px-1 py-[1px] rounded font-mono ml-3", dark ? "bg-[#2D3348]" : "bg-gray-100")}>
                <Command className="w-2.5 h-2.5 inline" />K
              </kbd>
            </button>
            <button onClick={handleRefresh} disabled={isRefreshing}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#1E2235] transition-colors"
            >
              <RefreshCw className={cn("w-[15px] h-[15px] text-gray-400", isRefreshing && "animate-spin")} />
            </button>
            <button onClick={() => setDark(!dark)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#1E2235] transition-colors"
            >
              {dark ? <Sun className="w-[15px] h-[15px] text-gray-400" /> : <Moon className="w-[15px] h-[15px] text-gray-400" />}
            </button>
            {lastRefresh && (
              <span className="hidden lg:block text-[11px] text-gray-400 ml-2 tabular-nums">
                {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ─── Content ─── */}
      <main className="max-w-[1400px] mx-auto px-5 py-5">

        {/* ══════════ COMMAND CENTER ══════════ */}
        {view === "command" && (
          <div className="space-y-5">
            {/* Title row */}
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.02em]">AR Command Center</h1>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => setView("upload")}
                className="flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-medium bg-[#1E2033] text-white rounded-lg hover:bg-[#2a2d45] transition-colors"
              >
                <Upload className="w-[14px] h-[14px]" />Upload
              </button>
            </div>

            {isLoading ? <SkeletonDashboard /> : (
              <>
                {/* ── KPI Row ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Total Active */}
                  <button onClick={() => { clearFilters(); setView("contracts"); }}
                    className={cn("kpi-card text-left p-4 rounded-xl border", dark ? "bg-[#1A1D2E] border-[#2D3348]" : "bg-white border-gray-200 hover:border-gray-300")}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", dark ? "bg-gray-800" : "bg-gray-100")}>
                        <FileText className="w-[14px] h-[14px] text-gray-500" />
                      </div>
                    </div>
                    <p className="text-[22px] font-semibold tracking-[-0.02em] leading-none">{stats.totalContracts}</p>
                    <p className="text-[12px] text-gray-500 mt-1">Total Active</p>
                  </button>

                  {/* Due Today */}
                  <button onClick={() => applyFilter({ category: "due_to_close_today" })}
                    className={cn("kpi-card text-left p-4 rounded-xl border", dark ? "bg-[#1A1D2E] border-[#2D3348]" : "bg-white border-gray-200 hover:border-amber-300",
                      categoryFilter === "due_to_close_today" && "ring-2 ring-amber-200 border-amber-300 dark:ring-amber-800")}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                        <Clock className="w-[14px] h-[14px] text-amber-600" />
                      </div>
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-[2px] rounded-md uppercase tracking-wide">Today</span>
                    </div>
                    <p className="text-[22px] font-semibold tracking-[-0.02em] leading-none">{stats.dueToCloseToday}</p>
                    <p className="text-[12px] text-gray-500 mt-1">Due to Close</p>
                  </button>

                  {/* Overdue */}
                  <button onClick={() => applyFilter({ category: "over_due_closing" })}
                    className={cn("kpi-card text-left p-4 rounded-xl border", dark ? "bg-[#1A1D2E] border-[#2D3348]" : "bg-white border-gray-200 hover:border-red-300",
                      categoryFilter === "over_due_closing" && "ring-2 ring-red-200 border-red-300 dark:ring-red-800")}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
                        <AlertTriangle className="w-[14px] h-[14px] text-red-600" />
                      </div>
                      {stats.overdue > 0 && <span className="text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 px-1.5 py-[2px] rounded-md">{stats.overdue} at risk</span>}
                    </div>
                    <p className="text-[22px] font-semibold tracking-[-0.02em] leading-none">{stats.overdue}</p>
                    <p className="text-[12px] text-gray-500 mt-1">Overdue</p>
                  </button>

                  {/* Not Called */}
                  <button onClick={() => applyFilter({ call: "not_called" })}
                    className={cn("kpi-card text-left p-4 rounded-xl border", dark ? "bg-[#1A1D2E] border-[#2D3348]" : "bg-white border-gray-200 hover:border-violet-300",
                      callFilter === "not_called" && "ring-2 ring-violet-200 border-violet-300 dark:ring-violet-800")}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
                        <PhoneMissed className="w-[14px] h-[14px] text-violet-600" />
                      </div>
                      <span className="text-[10px] font-medium text-gray-400">{contactRate}% done</span>
                    </div>
                    <p className="text-[22px] font-semibold tracking-[-0.02em] leading-none">{stats.notCalled}</p>
                    <p className="text-[12px] text-gray-500 mt-1">Not Called</p>
                  </button>

                  {/* WA Pending */}
                  <button onClick={() => applyFilter({ whatsapp: "not_sent" })}
                    className={cn("kpi-card text-left p-4 rounded-xl border", dark ? "bg-[#1A1D2E] border-[#2D3348]" : "bg-white border-gray-200 hover:border-blue-300",
                      whatsappFilter === "not_sent" && "ring-2 ring-blue-200 border-blue-300 dark:ring-blue-800")}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                        <MessageSquare className="w-[14px] h-[14px] text-blue-600" />
                      </div>
                      <span className="text-[10px] font-medium text-gray-400">{stats.whatsappSent} sent</span>
                    </div>
                    <p className="text-[22px] font-semibold tracking-[-0.02em] leading-none">{stats.whatsappNotSent}</p>
                    <p className="text-[12px] text-gray-500 mt-1">WA Pending</p>
                  </button>

                  {/* Outstanding */}
                  <button onClick={() => { clearFilters(); setView("contracts"); }}
                    className={cn("kpi-card text-left p-4 rounded-xl border", dark ? "bg-[#1A1D2E] border-[#2D3348]" : "bg-white border-gray-200 hover:border-emerald-300")}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                        <DollarSign className="w-[14px] h-[14px] text-emerald-600" />
                      </div>
                      <span className="text-[10px] font-medium text-gray-400">{stats.contractsWithOutstanding} contracts</span>
                    </div>
                    <p className="text-[18px] font-semibold tracking-[-0.02em] leading-none">{formatAED(stats.totalOutstanding)}</p>
                    <p className="text-[12px] text-gray-500 mt-1">Outstanding</p>
                  </button>
                </div>

                {/* ── Operational Panels ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Resolution Progress */}
                  <div className={cn("p-4 rounded-xl border", dark ? "bg-[#1A1D2E] border-[#2D3348]" : "bg-white border-gray-200")}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[13px] font-semibold">Resolution Progress</h3>
                      <span className={cn("text-[11px] font-semibold tabular-nums px-1.5 py-[2px] rounded-md",
                        actionRate > 50 ? "text-emerald-700 bg-emerald-50" : actionRate > 20 ? "text-amber-700 bg-amber-50" : "text-gray-500 bg-gray-100"
                      )}>{actionRate}%</span>
                    </div>
                    <div className={cn("w-full h-1.5 rounded-full overflow-hidden mb-4", dark ? "bg-gray-800" : "bg-gray-100")}>
                      <div className="progress-bar h-full rounded-full bg-gradient-to-r from-[#212191] to-[#6366F1]" style={{ width: `${actionRate}%` }} />
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: "Extended", val: stats.extended, color: "bg-blue-500" },
                        { label: "Returning", val: stats.returning, color: "bg-violet-500" },
                        { label: "Closed", val: stats.closed, color: "bg-emerald-500" },
                        { label: "Immobilised", val: stats.immobilised, color: "bg-red-500" },
                        { label: "No Action", val: stats.actionNone, color: "bg-gray-300 dark:bg-gray-600" },
                      ].map((r) => (
                        <div key={r.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full", r.color)} />
                            <span className="text-[12px] text-gray-500">{r.label}</span>
                          </div>
                          <span className="text-[12px] font-medium tabular-nums">{r.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact Status */}
                  <div className={cn("p-4 rounded-xl border", dark ? "bg-[#1A1D2E] border-[#2D3348]" : "bg-white border-gray-200")}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[13px] font-semibold">Contact Status</h3>
                      <span className={cn("text-[11px] font-semibold tabular-nums px-1.5 py-[2px] rounded-md",
                        contactRate > 50 ? "text-emerald-700 bg-emerald-50" : "text-gray-500 bg-gray-100"
                      )}>{contactRate}%</span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: "Called", val: stats.called, color: "bg-emerald-500" },
                        { label: "No Answer", val: stats.noAnswer, color: "bg-amber-500" },
                        { label: "Callback", val: stats.callback, color: "bg-blue-500" },
                        { label: "Not Called", val: stats.notCalled, color: "bg-gray-300 dark:bg-gray-600" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2.5">
                          <span className="text-[12px] text-gray-500 w-[72px] shrink-0">{item.label}</span>
                          <div className={cn("flex-1 h-[6px] rounded-full overflow-hidden", dark ? "bg-gray-800" : "bg-gray-100")}>
                            <div className={cn("h-full rounded-full progress-bar", item.color)}
                              style={{ width: `${stats.totalContracts > 0 ? (item.val / stats.totalContracts) * 100 : 0}%` }} />
                          </div>
                          <span className="text-[12px] font-medium tabular-nums w-7 text-right">{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Needs Attention */}
                  <div className={cn("p-4 rounded-xl border", dark ? "bg-[#1A1D2E] border-[#2D3348]" : "bg-white border-gray-200")}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[13px] font-semibold">Needs Attention</h3>
                      <button onClick={() => applyFilter({ category: "over_due_closing" })}
                        className="text-[11px] font-medium text-[#212191] dark:text-blue-400 hover:underline flex items-center gap-0.5"
                      >View all<ChevronRight className="w-3 h-3" /></button>
                    </div>
                    <div className="space-y-0.5">
                      {contracts
                        .filter((c) => c.category === "over_due_closing" && c.action_taken === "none")
                        .slice(0, 5)
                        .map((c) => {
                          const days = daysOverdue(c.end_date);
                          return (
                            <div key={c.id}
                              className={cn("flex items-center justify-between py-2 px-2 -mx-2 rounded-lg", dark ? "hover:bg-[#1E2235]" : "hover:bg-gray-50")}
                            >
                              <div className="min-w-0 mr-2">
                                <p className="text-[12px] font-medium truncate">{c.customer_name || c.agreement_no}</p>
                                <p className="text-[11px] text-gray-400">{c.vehicle_no} {c.make_model ? `· ${c.make_model}` : ""}</p>
                              </div>
                              <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 whitespace-nowrap tabular-nums">{days}d</span>
                            </div>
                          );
                        })}
                      {contracts.filter((c) => c.category === "over_due_closing" && c.action_taken === "none").length === 0 && (
                        <p className="text-[12px] text-gray-400 text-center py-6">All clear</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mr-1">Quick filters</span>
                  {[
                    { label: `Overdue ${stats.overdue}`, fn: () => applyFilter({ category: "over_due_closing" }) },
                    { label: `Due Today ${stats.dueToCloseToday}`, fn: () => applyFilter({ category: "due_to_close_today" }) },
                    { label: `Not Called ${stats.notCalled}`, fn: () => applyFilter({ call: "not_called" }) },
                    { label: `WA Pending ${stats.whatsappNotSent}`, fn: () => applyFilter({ whatsapp: "not_sent" }) },
                    { label: `No Action ${stats.actionNone}`, fn: () => applyFilter({ action: "none" }) },
                  ].map((p) => (
                    <button key={p.label} onClick={p.fn}
                      className={cn("px-2.5 py-[5px] text-[11px] font-medium rounded-lg border transition-all",
                        dark ? "border-[#2D3348] text-gray-400 hover:border-gray-600 hover:text-gray-200" : "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                      )}
                    >{p.label}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════ CONTRACTS ══════════ */}
        {view === "contracts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <h1 className="text-[20px] font-semibold tracking-[-0.02em]">Contracts</h1>
                <span className={cn("text-[11px] font-medium px-2 py-[3px] rounded-md tabular-nums", dark ? "bg-[#1E2235] text-gray-400" : "bg-gray-100 text-gray-500")}>
                  {contracts.length}
                </span>
                {hasActiveFilters && (
                  <button onClick={clearFilters}
                    className="flex items-center gap-1 px-2 py-[3px] text-[11px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
                  ><X className="w-3 h-3" />Clear</button>
                )}
              </div>
            </div>

            {/* Search + Filters */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative flex-1 min-w-[180px] max-w-[280px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-gray-400" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className={cn("w-full pl-8 pr-3 py-[7px] text-[13px] rounded-lg border outline-none transition-colors",
                    dark ? "bg-[#1A1D2E] border-[#2D3348] placeholder:text-gray-500 focus:border-[#4F46E5]" : "bg-white border-gray-200 placeholder:text-gray-400 focus:border-[#212191] focus:ring-1 focus:ring-[#212191]/10"
                  )}
                />
              </div>
              {[
                { val: categoryFilter, set: setCategoryFilter, opts: [["all", "Category"], ["due_to_close_today", "Due Today"], ["over_due_closing", "Overdue"]] },
                { val: callFilter, set: setCallFilter, opts: [["all", "Call Status"], ["not_called", "Not Called"], ["called", "Called"], ["no_answer", "No Answer"], ["callback", "Callback"]] },
                { val: actionFilter, set: setActionFilter, opts: [["all", "Resolution"], ["none", "Pending"], ["extended", "Extended"], ["returning", "Returning"], ["closed", "Closed"], ["immobilised", "Immobilised"]] },
              ].map((f, i) => (
                <select key={i} value={f.val} onChange={(e) => f.set(e.target.value)}
                  className={cn("px-2.5 py-[7px] text-[13px] rounded-lg border outline-none",
                    dark ? "bg-[#1A1D2E] border-[#2D3348]" : "bg-white border-gray-200"
                  )}
                >
                  {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ))}
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)}
              </div>
            ) : contracts.length === 0 ? (
              <div className="flex flex-col items-center py-16">
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-3", dark ? "bg-[#1E2235]" : "bg-gray-100")}>
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-[14px] font-medium">No contracts found</p>
                <p className="text-[13px] text-gray-500 mt-1">{hasActiveFilters ? "Try adjusting filters" : "Upload data to begin"}</p>
                {hasActiveFilters && <button onClick={clearFilters} className="mt-3 text-[13px] text-[#212191] hover:underline">Clear filters</button>}
              </div>
            ) : (
              <div className={cn("rounded-xl border overflow-hidden", dark ? "border-[#2D3348]" : "border-gray-200")}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={cn("border-b text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-400",
                        dark ? "bg-[#151722] border-[#2D3348]" : "bg-gray-50/80 border-gray-200"
                      )}>
                        <th className="text-left px-4 py-2.5">Customer</th>
                        <th className="text-left px-4 py-2.5">Vehicle</th>
                        <th className="text-left px-4 py-2.5">Status</th>
                        <th className="text-left px-4 py-2.5">Days</th>
                        <th className="text-right px-4 py-2.5">Outstanding</th>
                        <th className="text-left px-4 py-2.5">Call</th>
                        <th className="text-left px-4 py-2.5">WA</th>
                        <th className="text-left px-4 py-2.5">Resolution</th>
                        <th className="w-10 px-2 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className={dark ? "bg-[#1A1D2E]" : "bg-white"}>
                      {contracts.map((c) => {
                        const days = daysOverdue(c.end_date);
                        const expanded = expandedRow === c.id;
                        return (
                          <tr key={c.id} className={cn("contract-row border-b", dark ? "border-[#1E2235]" : "border-gray-100")}>
                            <td className="px-4 py-2.5">
                              <button onClick={() => setExpandedRow(expanded ? null : c.id)} className="text-left group">
                                <p className="text-[13px] font-medium group-hover:text-[#212191] dark:group-hover:text-blue-400 transition-colors leading-tight">
                                  {c.customer_name || "—"}
                                </p>
                                <p className="text-[11px] text-gray-400 leading-tight">{c.agreement_no}</p>
                              </button>
                              {expanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                  className="mt-2 pt-2 border-t border-gray-100 dark:border-[#2D3348] text-[11px] text-gray-500 space-y-0.5"
                                >
                                  <p><b className="text-gray-600 dark:text-gray-400">Phone:</b> {c.contact_number || "—"}</p>
                                  <p><b className="text-gray-600 dark:text-gray-400">Sales:</b> {c.sales_person || "—"}</p>
                                  <p><b className="text-gray-600 dark:text-gray-400">Branch:</b> {c.branch || "—"}</p>
                                  <p><b className="text-gray-600 dark:text-gray-400">Dates:</b> {c.start_date || "?"} &rarr; {c.end_date || "?"}</p>
                                  {c.notes && <p><b className="text-gray-600 dark:text-gray-400">Notes:</b> {c.notes}</p>}
                                </motion.div>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <p className="text-[13px]">{c.vehicle_no || "—"}</p>
                              <p className="text-[11px] text-gray-400 truncate max-w-[110px]">{c.make_model}</p>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-[3px] rounded-md",
                                c.category === "over_due_closing"
                                  ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                              )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", c.category === "over_due_closing" ? "bg-red-500 pulse-dot" : "bg-amber-500")} />
                                {c.category === "over_due_closing" ? "Overdue" : "Due Today"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={cn("text-[13px] font-semibold tabular-nums",
                                days > 7 ? "text-red-600" : days > 0 ? "text-amber-600" : "text-gray-500"
                              )}>
                                {days > 0 ? `${days}d` : "Today"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span className="text-[13px] font-medium tabular-nums">
                                {c.outstanding_amount > 0 ? formatAED(c.outstanding_amount) : "—"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5"><Badge status={c.call_status} /></td>
                            <td className="px-4 py-2.5"><Badge status={c.whatsapp_status} /></td>
                            <td className="px-4 py-2.5"><Badge status={c.action_taken} /></td>
                            <td className="px-2 py-2.5">
                              <div className="row-actions">
                                <RowActions contract={c} onAction={handleAction} onSendWA={handleSendWhatsApp} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════ UPLOAD ══════════ */}
        {view === "upload" && (
          <div className="max-w-xl mx-auto space-y-5">
            <div>
              <h1 className="text-[20px] font-semibold tracking-[-0.02em]">Upload Data</h1>
              <p className="text-[13px] text-gray-500 mt-1">Import from Speed ERP Excel exports. Existing contracts are updated; action tracking is preserved.</p>
            </div>

            {/* Category */}
            <div className={cn("p-4 rounded-xl border", dark ? "bg-[#1A1D2E] border-[#2D3348]" : "bg-white border-gray-200")}>
              <p className="text-[13px] font-semibold mb-3">Category</p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: "due_to_close_today", label: "Due To Close Today", desc: "Expiring today", icon: Clock, color: "text-amber-600" },
                  { id: "over_due_closing", label: "Over Due Closing", desc: "Past return date", icon: AlertTriangle, color: "text-red-600" },
                ].map((cat) => (
                  <button key={cat.id} onClick={() => setUploadCategory(cat.id)}
                    className={cn("p-3 rounded-lg border text-left transition-all",
                      uploadCategory === cat.id
                        ? "border-[#212191] bg-[#E8EFFC] dark:bg-[#1E2A4A] dark:border-[#4F46E5] ring-1 ring-[#212191]/20"
                        : dark ? "border-[#2D3348] hover:border-[#4B5563]" : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <cat.icon className={cn("w-4 h-4 mb-1.5", cat.color)} />
                    <p className="text-[13px] font-medium">{cat.label}</p>
                    <p className="text-[11px] text-gray-500">{cat.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div
              className={cn("border-2 border-dashed rounded-xl p-10 text-center transition-all",
                isUploading ? "border-[#212191] bg-[#E8EFFC] dark:bg-[#1E2A4A]"
                  : dark ? "border-[#2D3348] hover:border-[#4B5563]" : "border-gray-300 hover:border-gray-400"
              )}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files?.[0]; if (f) handleUpload(f); }}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} className="hidden" />
              {isUploading ? (
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-full border-2 border-[#212191] border-t-transparent animate-spin mx-auto" />
                  <p className="text-[13px] font-medium">Processing...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mx-auto", dark ? "bg-[#2D3348]" : "bg-gray-100")}>
                    <Upload className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-[13px]">
                    Drop file or <button onClick={() => fileInputRef.current?.click()} className="font-medium text-[#212191] dark:text-blue-400 hover:underline">browse</button>
                  </p>
                  <p className="text-[11px] text-gray-400">.xlsx, .xls, .csv</p>
                </div>
              )}
            </div>

            {/* Expected columns */}
            <div className={cn("p-4 rounded-xl border", dark ? "bg-[#1A1D2E] border-[#2D3348]" : "bg-white border-gray-200")}>
              <p className="text-[13px] font-semibold mb-2">Expected Columns</p>
              <div className="flex flex-wrap gap-1.5">
                {["No", "Type", "Vehicle No", "Make And Model", "Customer", "Contact Number", "Sales Person", "Start Date", "Expected Date", "Branch", "Daily Rate", "Outstanding", "Total Amount"].map((col) => (
                  <span key={col} className={cn("text-[11px] px-2 py-[3px] rounded-md", dark ? "bg-[#2D3348] text-gray-400" : "bg-gray-100 text-gray-500")}>{col}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
