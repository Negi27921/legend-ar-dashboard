"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Users, AlertTriangle, Car, ArrowUpRight,
  MessageSquare, CreditCard, RefreshCw, Upload,
  ChevronDown, Activity, LayoutDashboard,
  Phone, PhoneOff, PhoneMissed, PhoneForwarded,
  Send, CheckCircle2, XCircle, FileText, Search,
  ChevronRight, Settings,
} from "lucide-react";

import type { ContractRow } from "@/lib/supabase";
import { cn, formatAED } from "@/lib/utils";

type Tab = "overview" | "contracts" | "upload";

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

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

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

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

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

      if (data.error) {
        showToast(`Error: ${data.error}`);
        return;
      }

      setContracts(data.contracts || []);
      setStats(data.stats || emptyStats);
      setLastRefresh(new Date());
    } catch {
      // DB not connected yet — show empty state
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, callFilter, whatsappFilter, actionFilter, searchQuery, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    showToast("Dashboard refreshed");
  }, [fetchData, showToast]);

  // --- Contract Actions ---

  const handleAction = useCallback(async (
    contractId: string,
    action: string,
    value: string
  ) => {
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId, action, value }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Optimistic update
      setContracts(prev => prev.map(c => {
        if (c.id !== contractId) return c;
        const updated = { ...c, last_updated: new Date().toISOString() };
        if (action === "call_status") updated.call_status = value as ContractRow["call_status"];
        if (action === "whatsapp_status") updated.whatsapp_status = value as ContractRow["whatsapp_status"];
        if (action === "action_taken") updated.action_taken = value as ContractRow["action_taken"];
        if (action === "note") updated.notes = value;
        return updated;
      }));

      const labels: Record<string, string> = {
        called: "Marked as Called",
        no_answer: "Marked as No Answer",
        callback: "Marked for Callback",
        sent: "WhatsApp Sent",
        replied: "WhatsApp Replied",
        extended: "Marked Extended",
        returning: "Marked Returning",
        closed: "Marked Closed",
        immobilised: "Marked Immobilised",
      };
      showToast(labels[value] || `${action}: ${value}`);
    } catch (err) {
      showToast(`Action failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [showToast]);

  // --- File Upload ---

  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", uploadCategory);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      showToast(
        `Uploaded ${data.filename}: ${data.total} rows (${data.newRows} new, ${data.updatedRows} updated)`
      );
      await fetchData();
    } catch (err) {
      showToast(`Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsUploading(false);
    }
  }, [uploadCategory, showToast, fetchData]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }, [handleUpload]);

  // --- Helpers ---

  const daysOverdue = (endDate: string | null): number => {
    if (!endDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
  };

  const navTabs = [
    { id: "overview" as Tab, label: "Overview", icon: LayoutDashboard },
    { id: "contracts" as Tab, label: "Contracts", icon: Car },
    { id: "upload" as Tab, label: "Upload Data", icon: Upload },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Legend Rentals</h1>
                <div className="text-[11px] text-slate-400 -mt-0.5 tracking-wider uppercase">AR Command Center</div>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {navTabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                    tab === t.id ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab === t.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white rounded-lg shadow-sm"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </span>
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                <div className={cn("w-2 h-2 rounded-full", stats.totalContracts > 0 ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                {stats.totalContracts > 0 ? `${stats.totalContracts} contracts` : "No data"}
              </div>
              <button
                onClick={handleRefresh}
                className={cn(
                  "p-2 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all",
                  isRefreshing && "animate-spin"
                )}
              >
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          <div className="md:hidden flex gap-1 pb-3 overflow-x-auto">
            {navTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2",
                  tab === t.id ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-500"
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">

          {/* ============ OVERVIEW TAB ============ */}
          {tab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>

              {stats.totalContracts === 0 && !isLoading ? (
                <div className="text-center py-20">
                  <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h2 className="text-lg font-semibold text-slate-600 mb-2">No contracts loaded</h2>
                  <p className="text-sm text-slate-400 mb-6">Upload an Excel export from Speed ERP to get started</p>
                  <button onClick={() => setTab("upload")} className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors">
                    Upload Data
                  </button>
                </div>
              ) : (
                <>
                  {/* Row 1: Key counts */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <StatBox label="Due To Close Today" value={stats.dueToCloseToday} color="amber" icon={<Clock className="w-5 h-5" />} />
                    <StatBox label="Overdue" value={stats.overdue} color="red" icon={<AlertTriangle className="w-5 h-5" />} />
                    <StatBox label="Total Contracts" value={stats.totalContracts} color="slate" icon={<Activity className="w-5 h-5" />} />
                    <StatBox label="Outstanding" value={formatAED(stats.totalOutstanding)} color="blue" icon={<CreditCard className="w-5 h-5" />} isText />
                  </div>

                  {/* Row 2: Call status */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <StatBox label="Not Called" value={stats.notCalled} color="slate" icon={<Phone className="w-5 h-5" />} onClick={() => { setCallFilter("not_called"); setTab("contracts"); }} />
                    <StatBox label="Called" value={stats.called} color="emerald" icon={<CheckCircle2 className="w-5 h-5" />} onClick={() => { setCallFilter("called"); setTab("contracts"); }} />
                    <StatBox label="No Answer" value={stats.noAnswer} color="orange" icon={<PhoneMissed className="w-5 h-5" />} onClick={() => { setCallFilter("no_answer"); setTab("contracts"); }} />
                    <StatBox label="Callback" value={stats.callback} color="purple" icon={<PhoneForwarded className="w-5 h-5" />} onClick={() => { setCallFilter("callback"); setTab("contracts"); }} />
                  </div>

                  {/* Row 3: WhatsApp + Actions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <StatBox label="WA Not Sent" value={stats.whatsappNotSent} color="slate" icon={<Send className="w-5 h-5" />} onClick={() => { setWhatsappFilter("not_sent"); setTab("contracts"); }} />
                    <StatBox label="WA Sent" value={stats.whatsappSent} color="emerald" icon={<Send className="w-5 h-5" />} onClick={() => { setWhatsappFilter("sent"); setTab("contracts"); }} />
                    <StatBox label="Extended" value={stats.extended} color="emerald" icon={<ArrowUpRight className="w-5 h-5" />} onClick={() => { setActionFilter("extended"); setTab("contracts"); }} />
                    <StatBox label="Returning" value={stats.returning} color="blue" icon={<Car className="w-5 h-5" />} onClick={() => { setActionFilter("returning"); setTab("contracts"); }} />
                  </div>

                  {/* Quick actions */}
                  <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-6">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button onClick={() => { setCategoryFilter("due_to_close_today"); setCallFilter("not_called"); setTab("contracts"); }}
                        className="p-4 rounded-xl border-2 border-dashed border-amber-200 hover:border-amber-400 hover:bg-amber-50 text-left transition-all">
                        <Phone className="w-5 h-5 text-amber-500 mb-2" />
                        <div className="text-sm font-semibold text-slate-700">Call Due Today (Not Called)</div>
                        <div className="text-xs text-slate-400 mt-0.5">{stats.dueToCloseToday} contracts expiring today</div>
                      </button>
                      <button onClick={() => { setCategoryFilter("over_due_closing"); setCallFilter("not_called"); setTab("contracts"); }}
                        className="p-4 rounded-xl border-2 border-dashed border-red-200 hover:border-red-400 hover:bg-red-50 text-left transition-all">
                        <AlertTriangle className="w-5 h-5 text-red-500 mb-2" />
                        <div className="text-sm font-semibold text-slate-700">Call Overdue (Not Called)</div>
                        <div className="text-xs text-slate-400 mt-0.5">{stats.overdue} overdue contracts</div>
                      </button>
                      <button onClick={() => { setTab("upload"); }}
                        className="p-4 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-left transition-all">
                        <Upload className="w-5 h-5 text-blue-500 mb-2" />
                        <div className="text-sm font-semibold text-slate-700">Upload New Data</div>
                        <div className="text-xs text-slate-400 mt-0.5">Import Excel from Speed ERP</div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ============ CONTRACTS TAB ============ */}
          {tab === "contracts" && (
            <motion.div key="contracts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>

              {/* Filters */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name, plate, contract no..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="flex-1 text-sm border-0 outline-none bg-transparent placeholder:text-slate-300"
                    />
                  </div>

                  <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter}
                    options={[{ v: "all", l: "All" }, { v: "due_to_close_today", l: "Due Today" }, { v: "over_due_closing", l: "Overdue" }]} />
                  <FilterSelect label="Call" value={callFilter} onChange={setCallFilter}
                    options={[{ v: "all", l: "All" }, { v: "not_called", l: "Not Called" }, { v: "called", l: "Called" }, { v: "no_answer", l: "No Answer" }, { v: "callback", l: "Callback" }]} />
                  <FilterSelect label="WhatsApp" value={whatsappFilter} onChange={setWhatsappFilter}
                    options={[{ v: "all", l: "All" }, { v: "not_sent", l: "Not Sent" }, { v: "sent", l: "Sent" }, { v: "replied", l: "Replied" }]} />
                  <FilterSelect label="Status" value={actionFilter} onChange={setActionFilter}
                    options={[{ v: "all", l: "All" }, { v: "none", l: "Pending" }, { v: "extended", l: "Extended" }, { v: "returning", l: "Returning" }, { v: "closed", l: "Closed" }]} />

                  {(categoryFilter !== "all" || callFilter !== "all" || whatsappFilter !== "all" || actionFilter !== "all" || searchQuery) && (
                    <button onClick={() => { setCategoryFilter("all"); setCallFilter("all"); setWhatsappFilter("all"); setActionFilter("all"); setSearchQuery(""); }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium">Clear Filters</button>
                  )}
                </div>
              </div>

              {/* Results count */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-slate-500">{contracts.length} contracts</div>
              </div>

              {/* Contract Cards */}
              <div className="space-y-3">
                {contracts.length === 0 && !isLoading && (
                  <div className="text-center py-12 text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">No contracts found</p>
                    <p className="text-xs mt-1">Try adjusting filters or upload data</p>
                  </div>
                )}

                {contracts.map(contract => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    daysOverdue={daysOverdue(contract.end_date)}
                    onAction={handleAction}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ============ UPLOAD TAB ============ */}
          {tab === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <h2 className="text-lg font-bold text-slate-800 mb-6">Upload Speed ERP Data</h2>

              <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-xl mx-auto">
                <div className="text-center mb-6">
                  <Upload className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-800">Upload Excel/CSV Export</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Download from Speed ERP using &quot;Export to Excel&quot; button, then upload here
                  </p>
                </div>

                {/* Category selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-600 mb-2">Data Category</label>
                  <select
                    value={uploadCategory}
                    onChange={e => setUploadCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="due_to_close_today">Due To Close Today</option>
                    <option value="over_due_closing">Over Due Closing</option>
                  </select>
                </div>

                {/* Upload area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-amber-400", "bg-amber-50"); }}
                  onDragLeave={e => { e.currentTarget.classList.remove("border-amber-400", "bg-amber-50"); }}
                  onDrop={e => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-amber-400", "bg-amber-50");
                    const file = e.dataTransfer.files[0];
                    if (file) handleUpload(file);
                  }}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 transition-all"
                >
                  {isUploading ? (
                    <div className="flex items-center justify-center gap-3">
                      <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
                      <span className="text-sm text-slate-600 font-medium">Processing...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-slate-500 font-medium">
                        Drag & drop Excel/CSV file here, or click to browse
                      </div>
                      <div className="text-xs text-slate-400 mt-2">.xlsx, .xls, .csv supported</div>
                    </>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={onFileChange}
                  className="hidden"
                />

                {/* Instructions */}
                <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                  <h4 className="text-sm font-semibold text-slate-600 mb-2">How to export from Speed ERP:</h4>
                  <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside">
                    <li>Open Speed ERP Dashboard</li>
                    <li>Click on &quot;Due To Close Today&quot; (148) or &quot;Over Due Closing&quot; (56)</li>
                    <li>Click the &quot;EXPORT TO EXCEL&quot; button at the top-right</li>
                    <li>Save the file and upload it here</li>
                    <li>Repeat for the other category</li>
                  </ol>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-md text-center"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// Sub-components
// ==========================================

function StatBox({ label, value, color, icon, isText, onClick }: {
  label: string;
  value: number | string;
  color: string;
  icon: React.ReactNode;
  isText?: boolean;
  onClick?: () => void;
}) {
  const bgColors: Record<string, string> = {
    amber: "bg-amber-50 border-amber-100",
    red: "bg-red-50 border-red-100",
    emerald: "bg-emerald-50 border-emerald-100",
    blue: "bg-blue-50 border-blue-100",
    purple: "bg-purple-50 border-purple-100",
    orange: "bg-orange-50 border-orange-100",
    slate: "bg-white border-slate-200",
  };
  const textColors: Record<string, string> = {
    amber: "text-amber-600",
    red: "text-red-600",
    emerald: "text-emerald-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
    slate: "text-slate-800",
  };
  const iconColors: Record<string, string> = {
    amber: "text-amber-400",
    red: "text-red-400",
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    orange: "text-orange-400",
    slate: "text-slate-400",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 transition-all",
        bgColors[color],
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02]"
      )}
    >
      <div className={cn("mb-2", iconColors[color])}>{icon}</div>
      <div className={cn(isText ? "text-lg" : "text-2xl", "font-bold", textColors[color])}>
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          "appearance-none text-xs font-medium pl-3 pr-7 py-2 rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500",
          value !== "all"
            ? "bg-amber-50 border-amber-200 text-amber-700"
            : "bg-slate-50 border-slate-200 text-slate-600"
        )}
      >
        {options.map(o => <option key={o.v} value={o.v}>{label}: {o.l}</option>)}
      </select>
      <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function ContractCard({ contract, daysOverdue: days, onAction }: {
  contract: ContractRow;
  daysOverdue: number;
  onAction: (id: string, action: string, value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState(contract.notes || "");
  const [showNote, setShowNote] = useState(false);

  const isOverdue = contract.category === "over_due_closing";

  return (
    <div className={cn(
      "bg-white rounded-2xl border p-4 transition-all",
      isOverdue ? "border-red-200" : "border-slate-200",
      contract.action_taken !== "none" && "opacity-60"
    )}>
      {/* Top row: contract info */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-slate-800">{contract.agreement_no}</span>
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
              isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
            )}>
              {isOverdue ? `${days}d overdue` : "Due Today"}
            </span>
            {contract.action_taken !== "none" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase">
                {contract.action_taken}
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-slate-700 mt-1">{contract.customer_name}</div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            <span>{contract.make_model}</span>
            {contract.vehicle_no && <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{contract.vehicle_no}</span>}
            {contract.contact_number && <span>{contract.contact_number}</span>}
          </div>
        </div>

        {/* Outstanding amount */}
        {contract.outstanding_amount > 0 && (
          <div className="text-right shrink-0">
            <div className="text-sm font-bold text-red-600">{formatAED(contract.outstanding_amount)}</div>
            <div className="text-[10px] text-slate-400">outstanding</div>
          </div>
        )}
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <StatusBadge
          icon={contract.call_status === "called" ? <CheckCircle2 className="w-3 h-3" /> : contract.call_status === "no_answer" ? <PhoneMissed className="w-3 h-3" /> : contract.call_status === "callback" ? <PhoneForwarded className="w-3 h-3" /> : <PhoneOff className="w-3 h-3" />}
          label={contract.call_status === "not_called" ? "Not Called" : contract.call_status === "called" ? "Called" : contract.call_status === "no_answer" ? "No Answer" : "Callback"}
          active={contract.call_status !== "not_called"}
          color={contract.call_status === "called" ? "emerald" : contract.call_status === "no_answer" ? "orange" : contract.call_status === "callback" ? "purple" : "slate"}
        />
        <StatusBadge
          icon={<Send className="w-3 h-3" />}
          label={contract.whatsapp_status === "not_sent" ? "WA Not Sent" : contract.whatsapp_status === "sent" ? "WA Sent" : contract.whatsapp_status === "replied" ? "WA Replied" : "WA Failed"}
          active={contract.whatsapp_status !== "not_sent"}
          color={contract.whatsapp_status === "sent" ? "emerald" : contract.whatsapp_status === "replied" ? "blue" : contract.whatsapp_status === "failed" ? "red" : "slate"}
        />
        {contract.notes && (
          <span className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">
            Has Note
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {/* Call actions */}
        <ActionBtn
          icon={<Phone className="w-3.5 h-3.5" />}
          label="Called"
          active={contract.call_status === "called"}
          onClick={() => onAction(contract.id, "call_status", "called")}
          color="emerald"
        />
        <ActionBtn
          icon={<PhoneMissed className="w-3.5 h-3.5" />}
          label="No Answer"
          active={contract.call_status === "no_answer"}
          onClick={() => onAction(contract.id, "call_status", "no_answer")}
          color="orange"
        />
        <ActionBtn
          icon={<PhoneForwarded className="w-3.5 h-3.5" />}
          label="Callback"
          active={contract.call_status === "callback"}
          onClick={() => onAction(contract.id, "call_status", "callback")}
          color="purple"
        />

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* WhatsApp */}
        <ActionBtn
          icon={<Send className="w-3.5 h-3.5" />}
          label="Send WA"
          active={contract.whatsapp_status === "sent"}
          onClick={() => onAction(contract.id, "whatsapp_status", "sent")}
          color="emerald"
        />

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Status actions */}
        <ActionBtn
          icon={<ArrowUpRight className="w-3.5 h-3.5" />}
          label="Extended"
          active={contract.action_taken === "extended"}
          onClick={() => onAction(contract.id, "action_taken", "extended")}
          color="blue"
        />
        <ActionBtn
          icon={<Car className="w-3.5 h-3.5" />}
          label="Returning"
          active={contract.action_taken === "returning"}
          onClick={() => onAction(contract.id, "action_taken", "returning")}
          color="blue"
        />
        <ActionBtn
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          label="Closed"
          active={contract.action_taken === "closed"}
          onClick={() => onAction(contract.id, "action_taken", "closed")}
          color="emerald"
        />

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Note */}
        <button
          onClick={() => setShowNote(!showNote)}
          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-50"
        >
          <FileText className="w-3.5 h-3.5" /> Note
        </button>

        {/* Expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
        >
          <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-90")} />
        </button>
      </div>

      {/* Note input */}
      {showNote && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={() => {
              if (noteText.trim()) {
                onAction(contract.id, "note", noteText.trim());
                setShowNote(false);
              }
            }}
            className="px-4 py-2 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600"
          >
            Save
          </button>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <Detail label="Type" value={contract.contract_type} />
          <Detail label="Start Date" value={contract.start_date} />
          <Detail label="End Date" value={contract.end_date} />
          <Detail label="Expected" value={contract.expected_date} />
          <Detail label="Branch" value={contract.branch} />
          <Detail label="In Branch" value={contract.in_branch} />
          <Detail label="Sales Person" value={contract.sales_person} />
          <Detail label="Rate" value={contract.daily_rate ? formatAED(contract.daily_rate) : "-"} />
          <Detail label="Total" value={contract.total_amount ? formatAED(contract.total_amount) : "-"} />
          <Detail label="Deposit" value={contract.deposit_amount ? formatAED(contract.deposit_amount) : "-"} />
          <Detail label="Email" value={contract.customer_email} />
          <Detail label="Last Updated" value={contract.last_updated ? new Date(contract.last_updated).toLocaleString("en-GB") : "-"} />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ icon, label, active, color }: { icon: React.ReactNode; label: string; active: boolean; color: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    red: "bg-red-50 text-red-700 border-red-200",
    slate: "bg-slate-50 text-slate-500 border-slate-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border", active ? colors[color] : colors.slate)}>
      {icon} {label}
    </span>
  );
}

function ActionBtn({ icon, label, active, onClick, color }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  const activeColors: Record<string, string> = {
    emerald: "bg-emerald-500 text-white border-emerald-500",
    orange: "bg-orange-500 text-white border-orange-500",
    purple: "bg-purple-500 text-white border-purple-500",
    blue: "bg-blue-500 text-white border-blue-500",
    red: "bg-red-500 text-white border-red-500",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all",
        active
          ? activeColors[color]
          : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
      )}
    >
      {icon} {label}
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-slate-400 text-[10px] uppercase tracking-wider">{label}</div>
      <div className="text-slate-700 font-medium mt-0.5 truncate">{value || "-"}</div>
    </div>
  );
}
