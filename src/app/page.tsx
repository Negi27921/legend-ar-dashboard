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
  Shield,
  Hash,
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

function CommandPalette({
  open,
  onClose,
  onCommand,
}: {
  open: boolean;
  onClose: () => void;
  onCommand: (cmd: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const commands = useMemo(() => [
    { id: "view-overdue", label: "View Overdue Contracts", icon: AlertTriangle, section: "Navigation" },
    { id: "view-due-today", label: "View Due Today", icon: Clock, section: "Navigation" },
    { id: "view-not-called", label: "View Not Called", icon: PhoneMissed, section: "Navigation" },
    { id: "view-wa-pending", label: "View WhatsApp Pending", icon: MessageSquare, section: "Navigation" },
    { id: "view-outstanding", label: "View Outstanding Balance", icon: DollarSign, section: "Navigation" },
    { id: "upload", label: "Upload Excel/CSV", icon: Upload, section: "Actions" },
    { id: "refresh", label: "Refresh Dashboard", icon: RefreshCw, section: "Actions" },
    { id: "toggle-theme", label: "Toggle Dark Mode", icon: Moon, section: "Preferences" },
  ], []);

  const filtered = commands.filter(
    (c) => c.label.toLowerCase().includes(query.toLowerCase())
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] cmd-backdrop flex items-start justify-center pt-[20vh]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-[560px] bg-white dark:bg-[#1A1D2E] rounded-xl shadow-2xl border border-[var(--color-border)] overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
            <Search className="w-4 h-4 text-[var(--color-muted)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-muted)]"
              onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
                if (e.key === "Enter" && filtered.length > 0) {
                  onCommand(filtered[0].id);
                  onClose();
                }
              }}
            />
            <kbd className="text-[10px] text-[var(--color-muted)] bg-[var(--color-border-light)] dark:bg-[#2D3348] px-1.5 py-0.5 rounded font-mono">ESC</kbd>
          </div>
          <div className="max-h-[320px] overflow-y-auto py-2">
            {filtered.length === 0 && (
              <p className="text-center text-sm text-[var(--color-muted)] py-8">No results found</p>
            )}
            {Object.entries(
              filtered.reduce((acc, cmd) => {
                (acc[cmd.section] = acc[cmd.section] || []).push(cmd);
                return acc;
              }, {} as Record<string, typeof commands>)
            ).map(([section, items]) => (
              <div key={section}>
                <p className="px-4 py-1.5 text-[11px] font-medium text-[var(--color-muted)] uppercase tracking-wider">{section}</p>
                {items.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => { onCommand(cmd.id); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--color-accent)] dark:hover:bg-[#2D3348] transition-colors text-left"
                  >
                    <cmd.icon className="w-4 h-4 text-[var(--color-muted)]" />
                    <span>{cmd.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  tooltip,
  onClick,
  isActive,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: "blue" | "red" | "amber" | "green" | "purple" | "slate";
  trend?: { label: string; direction: "up" | "down" | "neutral" };
  tooltip?: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const colorMap = {
    blue: { bg: "bg-blue-50 dark:bg-blue-950/30", icon: "text-blue-600 dark:text-blue-400", ring: "ring-blue-200 dark:ring-blue-800" },
    red: { bg: "bg-red-50 dark:bg-red-950/30", icon: "text-red-600 dark:text-red-400", ring: "ring-red-200 dark:ring-red-800" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/30", icon: "text-amber-600 dark:text-amber-400", ring: "ring-amber-200 dark:ring-amber-800" },
    green: { bg: "bg-green-50 dark:bg-green-950/30", icon: "text-green-600 dark:text-green-400", ring: "ring-green-200 dark:ring-green-800" },
    purple: { bg: "bg-purple-50 dark:bg-purple-950/30", icon: "text-purple-600 dark:text-purple-400", ring: "ring-purple-200 dark:ring-purple-800" },
    slate: { bg: "bg-slate-50 dark:bg-slate-800/30", icon: "text-slate-600 dark:text-slate-400", ring: "ring-slate-200 dark:ring-slate-700" },
  };

  const c = colorMap[color];

  return (
    <div
      className={cn(
        "kpi-card relative p-5 rounded-lg border bg-white dark:bg-[#1A1D2E]",
        isActive
          ? `ring-2 ${c.ring} border-transparent`
          : "border-[var(--color-border)] dark:border-[#2D3348]"
      )}
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && tooltip && (
          <motion.div
            className="tooltip-enter absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-50 px-3 py-2 rounded-lg bg-[#1E2033] text-white text-xs max-w-[220px] shadow-lg"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            {tooltip}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-[#1E2033]" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start justify-between">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", c.bg)}>
          <Icon className={cn("w-[18px] h-[18px]", c.icon)} />
        </div>
        {trend && (
          <span className={cn(
            "text-[11px] font-medium px-1.5 py-0.5 rounded",
            trend.direction === "up" ? "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/30" :
            trend.direction === "down" ? "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30" :
            "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-800/30"
          )}>
            {trend.label}
          </span>
        )}
      </div>

      <div className="mt-3">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-[13px] text-[var(--color-muted)] mt-0.5">{title}</p>
        {subtitle && (
          <p className="text-[11px] text-[var(--color-muted)] mt-1 opacity-70">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonKPI() {
  return (
    <div className="p-5 rounded-lg border border-[var(--color-border)] dark:border-[#2D3348] bg-white dark:bg-[#1A1D2E]">
      <div className="flex items-start justify-between">
        <div className="skeleton w-9 h-9 rounded-lg" />
        <div className="skeleton w-12 h-5 rounded" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="skeleton w-16 h-7 rounded" />
        <div className="skeleton w-24 h-4 rounded" />
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-3 p-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="skeleton w-8 h-8 rounded-full" />
          <div className="skeleton flex-1 h-5 rounded" />
          <div className="skeleton w-20 h-5 rounded" />
          <div className="skeleton w-16 h-5 rounded" />
          <div className="skeleton w-24 h-5 rounded" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status, type }: { status: string; type: "call" | "whatsapp" | "action" }) {
  const configs: Record<string, { label: string; class: string }> = {
    // Call
    not_called: { label: "Not Called", class: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    called: { label: "Called", class: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
    no_answer: { label: "No Answer", class: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
    callback: { label: "Callback", class: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
    // WhatsApp
    not_sent: { label: "Not Sent", class: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    sent: { label: "Sent", class: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
    replied: { label: "Replied", class: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
    failed: { label: "Failed", class: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
    // Action
    none: { label: "Pending", class: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    extended: { label: "Extended", class: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
    returning: { label: "Returning", class: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" },
    closed: { label: "Closed", class: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
    immobilised: { label: "Immobilised", class: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
  };

  const config = configs[status] || { label: status, class: "bg-slate-100 text-slate-700" };

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full", config.class)}>
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Contract Row Actions
// ---------------------------------------------------------------------------

function ContractActions({
  contract,
  onAction,
  onSendWA,
}: {
  contract: ContractRow;
  onAction: (id: string, action: string, value: string) => void;
  onSendWA: (c: ContractRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4 text-[var(--color-muted)]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-8 z-50 w-56 bg-white dark:bg-[#1A1D2E] rounded-xl border border-[var(--color-border)] dark:border-[#2D3348] shadow-xl py-1.5 overflow-hidden"
          >
            {/* Call Section */}
            <p className="px-3 py-1.5 text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">Call Status</p>
            <button onClick={() => { onAction(contract.id, "call_status", "called"); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--color-accent)] dark:hover:bg-[#2D3348] transition-colors">
              <Phone className="w-3.5 h-3.5 text-green-600" />Called
            </button>
            <button onClick={() => { onAction(contract.id, "call_status", "no_answer"); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--color-accent)] dark:hover:bg-[#2D3348] transition-colors">
              <PhoneMissed className="w-3.5 h-3.5 text-amber-600" />No Answer
            </button>
            <button onClick={() => { onAction(contract.id, "call_status", "callback"); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--color-accent)] dark:hover:bg-[#2D3348] transition-colors">
              <PhoneForwarded className="w-3.5 h-3.5 text-blue-600" />Callback
            </button>

            <div className="h-px bg-[var(--color-border)] dark:bg-[#2D3348] my-1.5" />

            {/* WhatsApp Section */}
            <p className="px-3 py-1.5 text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">WhatsApp</p>
            <button onClick={() => { onSendWA(contract); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--color-accent)] dark:hover:bg-[#2D3348] transition-colors">
              <Send className="w-3.5 h-3.5 text-green-600" />Send Reminder
            </button>

            <div className="h-px bg-[var(--color-border)] dark:bg-[#2D3348] my-1.5" />

            {/* Outcome Section */}
            <p className="px-3 py-1.5 text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">Resolution</p>
            <button onClick={() => { onAction(contract.id, "action_taken", "extended"); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--color-accent)] dark:hover:bg-[#2D3348] transition-colors">
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />Extended
            </button>
            <button onClick={() => { onAction(contract.id, "action_taken", "returning"); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--color-accent)] dark:hover:bg-[#2D3348] transition-colors">
              <Car className="w-3.5 h-3.5 text-purple-600" />Returning
            </button>
            <button onClick={() => { onAction(contract.id, "action_taken", "closed"); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--color-accent)] dark:hover:bg-[#2D3348] transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />Closed
            </button>
            <button onClick={() => { onAction(contract.id, "action_taken", "immobilised"); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--color-accent)] dark:hover:bg-[#2D3348] transition-colors">
              <Ban className="w-3.5 h-3.5 text-red-600" />Immobilised
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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

  // Contract detail
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
      if (e.key === "Escape") setCmdOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ---- Data fetching ----

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
    } catch {
      // DB not connected yet — show empty state
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, callFilter, whatsappFilter, actionFilter, searchQuery, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    showToast("Data refreshed");
  }, [fetchData, showToast]);

  // ---- Actions ----

  const handleAction = useCallback(async (contractId: string, action: string, value: string) => {
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId, action, value }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setContracts((prev) =>
        prev.map((c) => {
          if (c.id !== contractId) return c;
          const updated = { ...c, last_updated: new Date().toISOString() };
          if (action === "call_status") updated.call_status = value as ContractRow["call_status"];
          if (action === "whatsapp_status") updated.whatsapp_status = value as ContractRow["whatsapp_status"];
          if (action === "action_taken") updated.action_taken = value as ContractRow["action_taken"];
          if (action === "note") updated.notes = value;
          return updated;
        })
      );

      const labels: Record<string, string> = {
        called: "Marked as Called", no_answer: "No Answer", callback: "Callback Scheduled",
        sent: "WhatsApp Sent", replied: "WhatsApp Replied",
        extended: "Marked Extended", returning: "Marked Returning", closed: "Marked Closed", immobilised: "Marked Immobilised",
      };
      showToast(labels[value] || `${action}: ${value}`);
    } catch (err) {
      showToast(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [showToast]);

  const handleSendWhatsApp = useCallback(async (contract: ContractRow) => {
    if (!contract.contact_number) { showToast("No phone number"); return; }
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: contract.id,
          phone: contract.contact_number,
          customerName: contract.customer_name || "Customer",
          templateName: "contract_reminder",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setContracts((prev) =>
        prev.map((c) =>
          c.id === contract.id ? { ...c, whatsapp_status: "sent" as const, last_updated: new Date().toISOString() } : c
        )
      );
      showToast("WhatsApp sent successfully");
    } catch (err) {
      showToast(`WhatsApp failed: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }, [showToast]);

  // ---- Upload ----

  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", uploadCategory);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showToast(`Uploaded: ${data.total} rows (${data.newRows} new, ${data.updatedRows} updated)`);
      await fetchData();
    } catch (err) {
      showToast(`Upload failed: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setIsUploading(false);
    }
  }, [uploadCategory, showToast, fetchData]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }, [handleUpload]);

  // ---- Smart filters via KPI clicks ----

  const applyFilter = useCallback((filters: { category?: string; call?: string; whatsapp?: string; action?: string }) => {
    setCategoryFilter(filters.category || "all");
    setCallFilter(filters.call || "all");
    setWhatsappFilter(filters.whatsapp || "all");
    setActionFilter(filters.action || "all");
    setView("contracts");
  }, []);

  const clearFilters = useCallback(() => {
    setCategoryFilter("all");
    setCallFilter("all");
    setWhatsappFilter("all");
    setActionFilter("all");
    setSearchQuery("");
  }, []);

  // ---- Command handler ----

  const handleCommand = useCallback((cmd: string) => {
    switch (cmd) {
      case "view-overdue": applyFilter({ category: "over_due_closing" }); break;
      case "view-due-today": applyFilter({ category: "due_to_close_today" }); break;
      case "view-not-called": applyFilter({ call: "not_called" }); break;
      case "view-wa-pending": applyFilter({ whatsapp: "not_sent" }); break;
      case "view-outstanding": setView("contracts"); break;
      case "upload": setView("upload"); break;
      case "refresh": handleRefresh(); break;
      case "toggle-theme": setDark((d) => !d); break;
    }
  }, [applyFilter, handleRefresh]);

  // ---- Helpers ----

  const daysOverdue = (endDate: string | null): number => {
    if (!endDate) return 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
  };

  const hasActiveFilters = categoryFilter !== "all" || callFilter !== "all" || whatsappFilter !== "all" || actionFilter !== "all" || searchQuery !== "";

  // Computed
  const actionRate = stats.totalContracts > 0
    ? Math.round(((stats.extended + stats.returning + stats.closed + stats.immobilised) / stats.totalContracts) * 100)
    : 0;

  const contactRate = stats.totalContracts > 0
    ? Math.round(((stats.called + stats.noAnswer + stats.callback) / stats.totalContracts) * 100)
    : 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      {/* Command Palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onCommand={handleCommand} />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-[200] px-4 py-2.5 bg-[#1E2033] text-white text-sm rounded-lg shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#0F1117]/80 backdrop-blur-xl border-b border-[var(--color-border)] dark:border-[#2D3348]">
        <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#1E2033] dark:bg-[#212191] flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight">Legend AR</span>
            </div>

            <nav className="hidden md:flex items-center gap-1 ml-6">
              {[
                { id: "command" as View, label: "Command Center" },
                { id: "contracts" as View, label: "Contracts" },
                { id: "upload" as View, label: "Upload" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={cn(
                    "px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors",
                    view === item.id
                      ? "bg-[var(--color-accent)] dark:bg-[#2D3348] text-[#212191] dark:text-white"
                      : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-slate-50 dark:hover:bg-[#1E2235]"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-[13px] text-[var(--color-muted)] bg-slate-50 dark:bg-[#1E2235] border border-[var(--color-border)] dark:border-[#2D3348] rounded-lg hover:border-slate-300 dark:hover:border-[#4B5563] transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
              <kbd className="text-[10px] bg-white dark:bg-[#2D3348] px-1.5 py-0.5 rounded border border-[var(--color-border)] dark:border-[#3D4358] font-mono ml-4">
                <Command className="w-2.5 h-2.5 inline" />K
              </kbd>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E2235] transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn("w-4 h-4 text-[var(--color-muted)]", isRefreshing && "animate-spin")} />
            </button>

            <button
              onClick={() => setDark(!dark)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E2235] transition-colors"
              title="Toggle theme"
            >
              {dark ? <Sun className="w-4 h-4 text-[var(--color-muted)]" /> : <Moon className="w-4 h-4 text-[var(--color-muted)]" />}
            </button>

            {lastRefresh && (
              <span className="hidden lg:block text-[11px] text-[var(--color-muted)] ml-2">
                Last sync: {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-6 py-6">
        {/* ---- COMMAND CENTER VIEW ---- */}
        {view === "command" && (
          <div className="space-y-6">
            {/* Page Title */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Command Center</h1>
                <p className="text-[13px] text-[var(--color-muted)] mt-0.5">
                  Operational overview for {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => setView("upload")}
                className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium bg-[#1E2033] dark:bg-[#212191] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Data
              </button>
            </div>

            {/* KPI Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => <SkeletonKPI key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KPICard
                  title="Total Active"
                  value={stats.totalContracts}
                  icon={FileText}
                  color="slate"
                  subtitle={`${stats.dueToCloseToday + stats.overdue} need attention`}
                  tooltip="All contracts currently being tracked in the system"
                  onClick={() => { clearFilters(); setView("contracts"); }}
                  isActive={!hasActiveFilters && categoryFilter === "all"}
                />
                <KPICard
                  title="Due Today"
                  value={stats.dueToCloseToday}
                  icon={Clock}
                  color="amber"
                  trend={{ label: "Urgent", direction: "neutral" }}
                  tooltip="Contracts expiring today that require immediate action"
                  onClick={() => applyFilter({ category: "due_to_close_today" })}
                  isActive={categoryFilter === "due_to_close_today"}
                />
                <KPICard
                  title="Overdue"
                  value={stats.overdue}
                  icon={AlertTriangle}
                  color="red"
                  trend={stats.overdue > 0 ? { label: `${stats.overdue} at risk`, direction: "up" } : undefined}
                  tooltip="Contracts past their return date — highest priority for follow-up"
                  onClick={() => applyFilter({ category: "over_due_closing" })}
                  isActive={categoryFilter === "over_due_closing"}
                />
                <KPICard
                  title="Not Called"
                  value={stats.notCalled}
                  icon={PhoneMissed}
                  color="purple"
                  subtitle={`${contactRate}% contact rate`}
                  tooltip="Contracts where no call attempt has been made yet"
                  onClick={() => applyFilter({ call: "not_called" })}
                  isActive={callFilter === "not_called"}
                />
                <KPICard
                  title="WA Pending"
                  value={stats.whatsappNotSent}
                  icon={MessageSquare}
                  color="blue"
                  subtitle={`${stats.whatsappSent} sent`}
                  tooltip="Contracts where WhatsApp reminder has not been sent"
                  onClick={() => applyFilter({ whatsapp: "not_sent" })}
                  isActive={whatsappFilter === "not_sent"}
                />
                <KPICard
                  title="Outstanding"
                  value={formatAED(stats.totalOutstanding)}
                  icon={DollarSign}
                  color="green"
                  subtitle={`${stats.contractsWithOutstanding} contracts`}
                  tooltip="Total outstanding receivable amount across all active contracts"
                  onClick={() => { clearFilters(); setView("contracts"); }}
                />
              </div>
            )}

            {/* Operational Panels */}
            {!isLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Action Progress */}
                <div className="p-5 rounded-lg border border-[var(--color-border)] dark:border-[#2D3348] bg-white dark:bg-[#1A1D2E]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-semibold">Resolution Progress</h3>
                    <span className="text-[11px] text-[var(--color-muted)]">{actionRate}% resolved</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                    <div className="progress-bar h-full bg-gradient-to-r from-[#212191] to-[#4F46E5] rounded-full" style={{ width: `${actionRate}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-[12px] text-[var(--color-muted)]">Extended: {stats.extended}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-[12px] text-[var(--color-muted)]">Returning: {stats.returning}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-[12px] text-[var(--color-muted)]">Closed: {stats.closed}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-[12px] text-[var(--color-muted)]">Immobilised: {stats.immobilised}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Status */}
                <div className="p-5 rounded-lg border border-[var(--color-border)] dark:border-[#2D3348] bg-white dark:bg-[#1A1D2E]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-semibold">Contact Status</h3>
                    <span className="text-[11px] text-[var(--color-muted)]">{contactRate}% contacted</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: "Called", value: stats.called, color: "bg-green-500", total: stats.totalContracts },
                      { label: "No Answer", value: stats.noAnswer, color: "bg-amber-500", total: stats.totalContracts },
                      { label: "Callback", value: stats.callback, color: "bg-blue-500", total: stats.totalContracts },
                      { label: "Not Called", value: stats.notCalled, color: "bg-slate-300 dark:bg-slate-600", total: stats.totalContracts },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="text-[12px] text-[var(--color-muted)] w-20">{item.label}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full progress-bar", item.color)} style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }} />
                        </div>
                        <span className="text-[12px] font-medium w-8 text-right">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Needs Attention */}
                <div className="p-5 rounded-lg border border-[var(--color-border)] dark:border-[#2D3348] bg-white dark:bg-[#1A1D2E]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-semibold">Needs Attention</h3>
                    <button
                      onClick={() => applyFilter({ category: "over_due_closing" })}
                      className="text-[11px] text-[#212191] dark:text-blue-400 hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <div className="space-y-2">
                    {contracts
                      .filter((c) => c.category === "over_due_closing" && c.action_taken === "none")
                      .slice(0, 5)
                      .map((c) => {
                        const days = daysOverdue(c.end_date);
                        return (
                          <div
                            key={c.id}
                            className="flex items-center justify-between py-1.5 border-b border-[var(--color-border-light)] dark:border-[#2D3348] last:border-0"
                          >
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium truncate">{c.customer_name || c.agreement_no}</p>
                              <p className="text-[11px] text-[var(--color-muted)]">{c.vehicle_no}</p>
                            </div>
                            <span className="text-[11px] font-medium text-red-600 dark:text-red-400 whitespace-nowrap ml-2">
                              {days}d overdue
                            </span>
                          </div>
                        );
                      })}
                    {contracts.filter((c) => c.category === "over_due_closing" && c.action_taken === "none").length === 0 && (
                      <p className="text-[12px] text-[var(--color-muted)] text-center py-4">All clear</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Action Buttons */}
            {!isLoading && stats.totalContracts > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[12px] text-[var(--color-muted)] mr-1">Quick filters:</span>
                {[
                  { label: `Overdue (${stats.overdue})`, onClick: () => applyFilter({ category: "over_due_closing" }), active: categoryFilter === "over_due_closing" },
                  { label: `Due Today (${stats.dueToCloseToday})`, onClick: () => applyFilter({ category: "due_to_close_today" }), active: categoryFilter === "due_to_close_today" },
                  { label: `Not Called (${stats.notCalled})`, onClick: () => applyFilter({ call: "not_called" }), active: callFilter === "not_called" },
                  { label: `WA Pending (${stats.whatsappNotSent})`, onClick: () => applyFilter({ whatsapp: "not_sent" }), active: whatsappFilter === "not_sent" },
                  { label: `No Action (${stats.actionNone})`, onClick: () => applyFilter({ action: "none" }), active: actionFilter === "none" },
                ].map((pill) => (
                  <button
                    key={pill.label}
                    onClick={pill.onClick}
                    className={cn(
                      "px-3 py-1.5 text-[12px] font-medium rounded-full border transition-all",
                      pill.active
                        ? "bg-[#1E2033] dark:bg-[#212191] text-white border-transparent"
                        : "border-[var(--color-border)] dark:border-[#2D3348] text-[var(--color-muted)] hover:border-slate-300 dark:hover:border-[#4B5563] hover:text-[var(--color-foreground)]"
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- CONTRACTS VIEW ---- */}
        {view === "contracts" && (
          <div className="space-y-4">
            {/* Header Bar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold tracking-tight">Contracts</h1>
                <span className="text-[12px] text-[var(--color-muted)] bg-slate-100 dark:bg-[#2D3348] px-2 py-0.5 rounded-full">
                  {contracts.length} results
                </span>
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, agreement, vehicle..."
                  className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg border border-[var(--color-border)] dark:border-[#2D3348] bg-white dark:bg-[#1A1D2E] placeholder:text-[var(--color-muted)] focus:ring-2 focus:ring-[#212191]/20 focus:border-[#212191] dark:focus:border-[#4F46E5] transition-all outline-none"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-[13px] rounded-lg border border-[var(--color-border)] dark:border-[#2D3348] bg-white dark:bg-[#1A1D2E] text-[var(--color-foreground)] outline-none"
              >
                <option value="all">All Categories</option>
                <option value="due_to_close_today">Due Today</option>
                <option value="over_due_closing">Overdue</option>
              </select>

              <select
                value={callFilter}
                onChange={(e) => setCallFilter(e.target.value)}
                className="px-3 py-2 text-[13px] rounded-lg border border-[var(--color-border)] dark:border-[#2D3348] bg-white dark:bg-[#1A1D2E] text-[var(--color-foreground)] outline-none"
              >
                <option value="all">All Call Status</option>
                <option value="not_called">Not Called</option>
                <option value="called">Called</option>
                <option value="no_answer">No Answer</option>
                <option value="callback">Callback</option>
              </select>

              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-2 text-[13px] rounded-lg border border-[var(--color-border)] dark:border-[#2D3348] bg-white dark:bg-[#1A1D2E] text-[var(--color-foreground)] outline-none"
              >
                <option value="all">All Resolutions</option>
                <option value="none">Pending</option>
                <option value="extended">Extended</option>
                <option value="returning">Returning</option>
                <option value="closed">Closed</option>
                <option value="immobilised">Immobilised</option>
              </select>
            </div>

            {/* Table */}
            {isLoading ? (
              <SkeletonTable />
            ) : contracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#2D3348] flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-[var(--color-muted)]" />
                </div>
                <p className="text-[15px] font-medium">No contracts found</p>
                <p className="text-[13px] text-[var(--color-muted)] mt-1">
                  {hasActiveFilters ? "Try adjusting your filters" : "Upload Speed ERP data to get started"}
                </p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-3 text-[13px] text-[#212191] dark:text-blue-400 hover:underline">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--color-border)] dark:border-[#2D3348] bg-white dark:bg-[#1A1D2E] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] dark:border-[#2D3348] bg-slate-50/50 dark:bg-[#151722]">
                        <th className="px-4 py-3 text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">Vehicle</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">Days</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">Outstanding</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">Call</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">WhatsApp</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">Resolution</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((c) => {
                        const days = daysOverdue(c.end_date);
                        const isExpanded = expandedRow === c.id;

                        return (
                          <tr
                            key={c.id}
                            className="contract-row border-b border-[var(--color-border-light)] dark:border-[#1E2235] last:border-0"
                          >
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setExpandedRow(isExpanded ? null : c.id)}
                                className="text-left group"
                              >
                                <p className="text-[13px] font-medium group-hover:text-[#212191] dark:group-hover:text-blue-400 transition-colors">
                                  {c.customer_name || "—"}
                                </p>
                                <p className="text-[11px] text-[var(--color-muted)]">{c.agreement_no}</p>
                              </button>
                              {/* Expanded Detail */}
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-2 pt-2 border-t border-[var(--color-border-light)] dark:border-[#2D3348] text-[11px] text-[var(--color-muted)] space-y-1"
                                >
                                  <p><span className="font-medium">Phone:</span> {c.contact_number || "—"}</p>
                                  <p><span className="font-medium">Sales:</span> {c.sales_person || "—"}</p>
                                  <p><span className="font-medium">Branch:</span> {c.branch || "—"}</p>
                                  <p><span className="font-medium">Start:</span> {c.start_date || "—"}</p>
                                  <p><span className="font-medium">End:</span> {c.end_date || "—"}</p>
                                  {c.notes && <p><span className="font-medium">Notes:</span> {c.notes}</p>}
                                </motion.div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-[13px]">{c.vehicle_no || "—"}</p>
                              <p className="text-[11px] text-[var(--color-muted)] truncate max-w-[120px]">{c.make_model}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full",
                                c.category === "over_due_closing"
                                  ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                              )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", c.category === "over_due_closing" ? "bg-red-500 pulse-dot" : "bg-amber-500")} />
                                {c.category === "over_due_closing" ? "Overdue" : "Due Today"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "text-[13px] font-medium",
                                days > 3 ? "text-red-600 dark:text-red-400" : days > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-400"
                              )}>
                                {days > 0 ? `${days}d` : "Today"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[13px] font-medium">
                                {c.outstanding_amount > 0 ? formatAED(c.outstanding_amount) : "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={c.call_status} type="call" />
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={c.whatsapp_status} type="whatsapp" />
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={c.action_taken} type="action" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="row-actions">
                                <ContractActions
                                  contract={c}
                                  onAction={handleAction}
                                  onSendWA={handleSendWhatsApp}
                                />
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

        {/* ---- UPLOAD VIEW ---- */}
        {view === "upload" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Upload Data</h1>
              <p className="text-[13px] text-[var(--color-muted)] mt-1">
                Import contracts from Speed ERP Excel exports. Existing contracts will be updated while preserving action tracking.
              </p>
            </div>

            {/* Category selector */}
            <div className="p-5 rounded-xl border border-[var(--color-border)] dark:border-[#2D3348] bg-white dark:bg-[#1A1D2E]">
              <label className="text-[13px] font-medium block mb-3">Upload Category</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setUploadCategory("due_to_close_today")}
                  className={cn(
                    "p-4 rounded-lg border text-left transition-all",
                    uploadCategory === "due_to_close_today"
                      ? "border-[#212191] dark:border-[#4F46E5] bg-[var(--color-accent)] dark:bg-[#1E2A4A] ring-1 ring-[#212191]/20"
                      : "border-[var(--color-border)] dark:border-[#2D3348] hover:border-slate-300 dark:hover:border-[#4B5563]"
                  )}
                >
                  <Clock className="w-5 h-5 text-amber-600 mb-2" />
                  <p className="text-[13px] font-medium">Due To Close Today</p>
                  <p className="text-[11px] text-[var(--color-muted)] mt-0.5">Contracts expiring today</p>
                </button>
                <button
                  onClick={() => setUploadCategory("over_due_closing")}
                  className={cn(
                    "p-4 rounded-lg border text-left transition-all",
                    uploadCategory === "over_due_closing"
                      ? "border-[#212191] dark:border-[#4F46E5] bg-[var(--color-accent)] dark:bg-[#1E2A4A] ring-1 ring-[#212191]/20"
                      : "border-[var(--color-border)] dark:border-[#2D3348] hover:border-slate-300 dark:hover:border-[#4B5563]"
                  )}
                >
                  <AlertTriangle className="w-5 h-5 text-red-600 mb-2" />
                  <p className="text-[13px] font-medium">Over Due Closing</p>
                  <p className="text-[11px] text-[var(--color-muted)] mt-0.5">Contracts past return date</p>
                </button>
              </div>
            </div>

            {/* Drop zone */}
            <div
              className={cn(
                "relative border-2 border-dashed rounded-xl p-12 text-center transition-all",
                isUploading
                  ? "border-[#212191] bg-[var(--color-accent)] dark:bg-[#1E2A4A]"
                  : "border-[var(--color-border)] dark:border-[#2D3348] hover:border-slate-400 dark:hover:border-[#4B5563]"
              )}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file) handleUpload(file);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={onFileChange}
                className="hidden"
              />

              {isUploading ? (
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-full border-2 border-[#212191] border-t-transparent animate-spin mx-auto" />
                  <p className="text-[14px] font-medium">Processing file...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#2D3348] flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6 text-[var(--color-muted)]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium">Drop your file here or <button onClick={() => fileInputRef.current?.click()} className="text-[#212191] dark:text-blue-400 hover:underline">browse</button></p>
                    <p className="text-[12px] text-[var(--color-muted)] mt-1">Supports .xlsx, .xls, .csv from Speed ERP export</p>
                  </div>
                </div>
              )}
            </div>

            {/* Format Guide */}
            <div className="p-5 rounded-xl border border-[var(--color-border)] dark:border-[#2D3348] bg-white dark:bg-[#1A1D2E]">
              <h3 className="text-[13px] font-semibold mb-3">Expected Column Headers</h3>
              <p className="text-[12px] text-[var(--color-muted)] mb-3">
                The parser automatically maps these Speed ERP column names to the database. Unknown columns are ignored.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {["No", "Type", "Vehicle No", "Make And Model", "Customer", "Contact Number", "Email", "Sales Person", "Start Date", "Expected Date", "Branch", "Daily Rate", "Outstanding", "Total Amount"].map((col) => (
                  <span key={col} className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
                    <Hash className="w-3 h-3" />{col}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
