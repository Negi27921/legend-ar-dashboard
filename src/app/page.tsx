"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  Info,
  X,
  ChevronDown,
  Ban,
} from "lucide-react";

import type { ContractRow } from "@/lib/supabase";
import { cn, formatAED } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  totalContracts: 0,
  dueToCloseToday: 0,
  overdue: 0,
  notCalled: 0,
  called: 0,
  noAnswer: 0,
  callback: 0,
  whatsappNotSent: 0,
  whatsappSent: 0,
  whatsappReplied: 0,
  actionNone: 0,
  extended: 0,
  returning: 0,
  closed: 0,
  immobilised: 0,
  totalOutstanding: 0,
  contractsWithOutstanding: 0,
};

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

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
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ---- Data fetching ----

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (callFilter !== "all") params.set("call_status", callFilter);
      if (whatsappFilter !== "all")
        params.set("whatsapp_status", whatsappFilter);
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
      // DB not connected yet
    } finally {
      setIsLoading(false);
    }
  }, [
    categoryFilter,
    callFilter,
    whatsappFilter,
    actionFilter,
    searchQuery,
    showToast,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    showToast("Dashboard refreshed");
  }, [fetchData, showToast]);

  // ---- Actions ----

  const handleAction = useCallback(
    async (contractId: string, action: string, value: string) => {
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
            if (action === "call_status")
              updated.call_status = value as ContractRow["call_status"];
            if (action === "whatsapp_status")
              updated.whatsapp_status = value as ContractRow["whatsapp_status"];
            if (action === "action_taken")
              updated.action_taken = value as ContractRow["action_taken"];
            if (action === "note") updated.notes = value;
            return updated;
          })
        );

        const labels: Record<string, string> = {
          called: "Marked as Called",
          no_answer: "No Answer",
          callback: "Callback Scheduled",
          sent: "WhatsApp Sent",
          replied: "WhatsApp Replied",
          extended: "Marked Extended",
          returning: "Marked Returning",
          closed: "Marked Closed",
          immobilised: "Marked Immobilised",
        };
        showToast(labels[value] || `${action}: ${value}`);
      } catch (err) {
        showToast(
          `Failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    },
    [showToast]
  );

  const handleSendWhatsApp = useCallback(
    async (contract: ContractRow) => {
      if (!contract.contact_number) {
        showToast("No phone number for this contract");
        return;
      }
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
            c.id === contract.id
              ? {
                  ...c,
                  whatsapp_status: "sent" as const,
                  last_updated: new Date().toISOString(),
                }
              : c
          )
        );
        showToast("WhatsApp sent successfully");
      } catch (err) {
        showToast(
          `WhatsApp failed: ${err instanceof Error ? err.message : "Unknown"}`
        );
      }
    },
    [showToast]
  );

  // ---- Upload ----

  const handleUpload = useCallback(
    async (file: File) => {
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
        showToast(
          `Upload failed: ${err instanceof Error ? err.message : "Unknown"}`
        );
      } finally {
        setIsUploading(false);
      }
    },
    [uploadCategory, showToast, fetchData]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      e.target.value = "";
    },
    [handleUpload]
  );

  // ---- Helpers ----

  const daysOverdue = (endDate: string | null): number => {
    if (!endDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return Math.floor(
      (today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  const navigateToContracts = useCallback(
    (filters: {
      category?: string;
      call?: string;
      whatsapp?: string;
      action?: string;
    }) => {
      setCategoryFilter(filters.category || "all");
      setCallFilter(filters.call || "all");
      setWhatsappFilter(filters.whatsapp || "all");
      setActionFilter(filters.action || "all");
      setTab("contracts");
    },
    []
  );

  const clearFilters = useCallback(() => {
    setCategoryFilter("all");
    setCallFilter("all");
    setWhatsappFilter("all");
    setActionFilter("all");
    setSearchQuery("");
  }, []);

  const hasActiveFilters =
    categoryFilter !== "all" ||
    callFilter !== "all" ||
    whatsappFilter !== "all" ||
    actionFilter !== "all" ||
    searchQuery !== "";

  // Top 5 overdue for "Needs Attention"
  const needsAttention = [...contracts]
    .filter((c) => c.category === "over_due_closing" && c.action_taken === "none")
    .sort((a, b) => daysOverdue(b.end_date) - daysOverdue(a.end_date))
    .slice(0, 5);

  // ---- Render ----

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: logo + nav */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center">
                  <Car className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-900 tracking-tight">
                  Legend Rentals
                </span>
              </div>

              <nav className="hidden md:flex items-center gap-1">
                {(
                  [
                    { id: "overview", label: "Overview" },
                    { id: "contracts", label: "Contracts" },
                    { id: "upload", label: "Upload" },
                  ] as { id: Tab; label: string }[]
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "relative px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors",
                      tab === t.id
                        ? "text-gray-900 bg-gray-100"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Right: sync + refresh */}
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <span className="hidden sm:block text-xs text-gray-400">
                  {lastRefresh.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={cn(
                    "w-3.5 h-3.5 text-gray-500",
                    isRefreshing && "animate-spin"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          <div className="md:hidden flex gap-1 pb-2 overflow-x-auto">
            {(
              [
                { id: "overview", label: "Overview" },
                { id: "contracts", label: "Contracts" },
                { id: "upload", label: "Upload" },
              ] as { id: Tab; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
                  tab === t.id
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-200 text-gray-500"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {/* ===== OVERVIEW ===== */}
          {tab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {stats.totalContracts === 0 && !isLoading ? (
                <EmptyState onUpload={() => setTab("upload")} />
              ) : (
                <>
                  {/* Hero metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <HeroCard
                      label="Due Today"
                      value={stats.dueToCloseToday}
                      tooltip="Contracts with end date matching today"
                      variant="amber"
                      icon={<Clock className="w-5 h-5" />}
                      onClick={() =>
                        navigateToContracts({
                          category: "due_to_close_today",
                        })
                      }
                    />
                    <HeroCard
                      label="Overdue"
                      value={stats.overdue}
                      tooltip="Contracts past their end date that are still open"
                      variant="red"
                      icon={<AlertTriangle className="w-5 h-5" />}
                      onClick={() =>
                        navigateToContracts({ category: "over_due_closing" })
                      }
                    />
                    <HeroCard
                      label="Outstanding"
                      value={formatAED(stats.totalOutstanding)}
                      tooltip="Total unpaid amount across all active contracts"
                      variant="neutral"
                      icon={
                        <span className="text-[15px] font-semibold">AED</span>
                      }
                      isText
                    />
                  </div>

                  {/* Summary strip */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                      {/* Call status */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Calls
                        </span>
                        <SummaryPill
                          label="Not Called"
                          value={stats.notCalled}
                          color="gray"
                          onClick={() =>
                            navigateToContracts({ call: "not_called" })
                          }
                        />
                        <SummaryPill
                          label="Called"
                          value={stats.called}
                          color="green"
                          onClick={() =>
                            navigateToContracts({ call: "called" })
                          }
                        />
                        <SummaryPill
                          label="No Answer"
                          value={stats.noAnswer}
                          color="amber"
                          onClick={() =>
                            navigateToContracts({ call: "no_answer" })
                          }
                        />
                        <SummaryPill
                          label="Callback"
                          value={stats.callback}
                          color="purple"
                          onClick={() =>
                            navigateToContracts({ call: "callback" })
                          }
                        />
                      </div>

                      <div className="w-px h-5 bg-gray-200 hidden sm:block" />

                      {/* WA status */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          WhatsApp
                        </span>
                        <SummaryPill
                          label="Not Sent"
                          value={stats.whatsappNotSent}
                          color="gray"
                          onClick={() =>
                            navigateToContracts({ whatsapp: "not_sent" })
                          }
                        />
                        <SummaryPill
                          label="Sent"
                          value={stats.whatsappSent}
                          color="green"
                          onClick={() =>
                            navigateToContracts({ whatsapp: "sent" })
                          }
                        />
                        <SummaryPill
                          label="Replied"
                          value={stats.whatsappReplied}
                          color="blue"
                          onClick={() =>
                            navigateToContracts({ whatsapp: "replied" })
                          }
                        />
                      </div>

                      <div className="w-px h-5 bg-gray-200 hidden sm:block" />

                      {/* Action status */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Status
                        </span>
                        <SummaryPill
                          label="Pending"
                          value={stats.actionNone}
                          color="gray"
                          onClick={() =>
                            navigateToContracts({ action: "none" })
                          }
                        />
                        <SummaryPill
                          label="Extended"
                          value={stats.extended}
                          color="green"
                          onClick={() =>
                            navigateToContracts({ action: "extended" })
                          }
                        />
                        <SummaryPill
                          label="Returning"
                          value={stats.returning}
                          color="blue"
                          onClick={() =>
                            navigateToContracts({ action: "returning" })
                          }
                        />
                        <SummaryPill
                          label="Closed"
                          value={stats.closed}
                          color="green"
                          onClick={() =>
                            navigateToContracts({ action: "closed" })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Needs Attention */}
                  {needsAttention.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-900">
                          Needs Attention
                        </h2>
                        <button
                          onClick={() =>
                            navigateToContracts({
                              category: "over_due_closing",
                              action: "none",
                            })
                          }
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          View all
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-400 font-medium">
                              <th className="px-4 py-2">Contract</th>
                              <th className="px-4 py-2">Customer</th>
                              <th className="px-4 py-2">Vehicle</th>
                              <th className="px-4 py-2 text-right">
                                Days Overdue
                              </th>
                              <th className="px-4 py-2 text-right">
                                Outstanding
                              </th>
                              <th className="px-4 py-2">Call</th>
                            </tr>
                          </thead>
                          <tbody>
                            {needsAttention.map((c) => (
                              <tr
                                key={c.id}
                                className="border-t border-gray-50 hover:bg-gray-50/50"
                              >
                                <td className="px-4 py-2 font-mono text-xs font-medium text-gray-800">
                                  {c.agreement_no}
                                </td>
                                <td className="px-4 py-2 text-gray-700 truncate max-w-[180px]">
                                  {c.customer_name || "-"}
                                </td>
                                <td className="px-4 py-2 text-gray-500">
                                  {c.make_model || "-"}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <span className="text-red-600 font-semibold">
                                    {daysOverdue(c.end_date)}d
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right font-medium text-gray-800">
                                  {c.outstanding_amount > 0
                                    ? formatAED(c.outstanding_amount)
                                    : "-"}
                                </td>
                                <td className="px-4 py-2">
                                  <StatusDot status={c.call_status} type="call" />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ===== CONTRACTS ===== */}
          {tab === "contracts" && (
            <motion.div
              key="contracts"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Filter bar */}
              <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-[180px] px-2">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search contracts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 text-sm border-0 outline-none bg-transparent placeholder:text-gray-300"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <FilterPill
                      label="Category"
                      value={categoryFilter}
                      options={[
                        { v: "all", l: "All" },
                        { v: "due_to_close_today", l: "Due Today" },
                        { v: "over_due_closing", l: "Overdue" },
                      ]}
                      onChange={setCategoryFilter}
                    />
                    <FilterPill
                      label="Call"
                      value={callFilter}
                      options={[
                        { v: "all", l: "All" },
                        { v: "not_called", l: "Not Called" },
                        { v: "called", l: "Called" },
                        { v: "no_answer", l: "No Answer" },
                        { v: "callback", l: "Callback" },
                      ]}
                      onChange={setCallFilter}
                    />
                    <FilterPill
                      label="WhatsApp"
                      value={whatsappFilter}
                      options={[
                        { v: "all", l: "All" },
                        { v: "not_sent", l: "Not Sent" },
                        { v: "sent", l: "Sent" },
                        { v: "replied", l: "Replied" },
                      ]}
                      onChange={setWhatsappFilter}
                    />
                    <FilterPill
                      label="Status"
                      value={actionFilter}
                      options={[
                        { v: "all", l: "All" },
                        { v: "none", l: "Pending" },
                        { v: "extended", l: "Extended" },
                        { v: "returning", l: "Returning" },
                        { v: "closed", l: "Closed" },
                      ]}
                      onChange={setActionFilter}
                    />

                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1"
                      >
                        <X className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Results count */}
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs text-gray-400">
                  {contracts.length} contract
                  {contracts.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-gray-400 font-medium uppercase tracking-wider border-b border-gray-100">
                        <th className="pl-4 pr-2 py-2.5 w-[2px]"></th>
                        <th className="px-3 py-2.5">Contract</th>
                        <th className="px-3 py-2.5">Customer</th>
                        <th className="px-3 py-2.5 hidden lg:table-cell">
                          Vehicle
                        </th>
                        <th className="px-3 py-2.5 hidden md:table-cell">
                          Plate
                        </th>
                        <th className="px-3 py-2.5 text-right">Days</th>
                        <th className="px-3 py-2.5 text-right hidden sm:table-cell">
                          Outstanding
                        </th>
                        <th className="px-3 py-2.5 text-center">Call</th>
                        <th className="px-3 py-2.5 text-center hidden sm:table-cell">
                          WA
                        </th>
                        <th className="px-3 py-2.5 text-center">Status</th>
                        <th className="px-3 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.length === 0 && !isLoading && (
                        <tr>
                          <td
                            colSpan={11}
                            className="text-center py-16 text-gray-400"
                          >
                            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm font-medium">
                              No contracts found
                            </p>
                            <p className="text-xs mt-1">
                              Adjust filters or upload data
                            </p>
                          </td>
                        </tr>
                      )}

                      {contracts.map((contract) => (
                        <ContractRow
                          key={contract.id}
                          contract={contract}
                          days={daysOverdue(contract.end_date)}
                          onAction={handleAction}
                          onSendWhatsApp={handleSendWhatsApp}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== UPLOAD ===== */}
          {tab === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="max-w-lg mx-auto"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Upload Data
              </h2>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                {/* Category */}
                <div className="mb-5">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="due_to_close_today">
                      Due To Close Today
                    </option>
                    <option value="over_due_closing">Over Due Closing</option>
                  </select>
                </div>

                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add(
                      "border-gray-900",
                      "bg-gray-50"
                    );
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove(
                      "border-gray-900",
                      "bg-gray-50"
                    );
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove(
                      "border-gray-900",
                      "bg-gray-50"
                    );
                    const file = e.dataTransfer.files[0];
                    if (file) handleUpload(file);
                  }}
                  className="border-2 border-dashed border-gray-200 rounded-lg p-10 text-center cursor-pointer hover:border-gray-400 transition-colors"
                >
                  {isUploading ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Processing...
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 font-medium">
                        Drop file here or click to browse
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        .xlsx, .xls, .csv
                      </p>
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
                <div className="mt-5 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-1.5">
                    Speed ERP Export
                  </p>
                  <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Open Speed ERP Dashboard</li>
                    <li>
                      Click &quot;Due To Close Today&quot; or &quot;Over Due
                      Closing&quot;
                    </li>
                    <li>Click &quot;EXPORT TO EXCEL&quot; at top-right</li>
                    <li>Upload the file here</li>
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
            initial={{ opacity: 0, y: 40, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===========================================================================
// Sub-components
// ===========================================================================

// ---- Hero Card ----

function HeroCard({
  label,
  value,
  tooltip,
  variant,
  icon,
  isText,
  onClick,
}: {
  label: string;
  value: number | string;
  tooltip: string;
  variant: "amber" | "red" | "neutral";
  icon: React.ReactNode;
  isText?: boolean;
  onClick?: () => void;
}) {
  const [showTip, setShowTip] = useState(false);

  const bg = {
    amber: "bg-amber-50 border-amber-200/60",
    red: "bg-red-50 border-red-200/60",
    neutral: "bg-white border-gray-200",
  }[variant];

  const numColor = {
    amber: "text-amber-700",
    red: "text-red-700",
    neutral: "text-gray-900",
  }[variant];

  const iconColor = {
    amber: "text-amber-400",
    red: "text-red-400",
    neutral: "text-gray-400",
  }[variant];

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-xl border p-5 transition-all",
        bg,
        onClick && "cursor-pointer hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-medium text-gray-500">{label}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTip(!showTip);
              }}
              className="text-gray-300 hover:text-gray-500"
            >
              <Info className="w-3 h-3" />
            </button>
          </div>
          <div
            className={cn(
              isText ? "text-xl" : "text-3xl",
              "font-bold tracking-tight",
              numColor
            )}
          >
            {value}
          </div>
        </div>
        <div className={cn("mt-1", iconColor)}>{icon}</div>
      </div>
      {showTip && (
        <div className="absolute top-full left-4 right-4 mt-1 p-2 bg-gray-900 text-white text-xs rounded-md shadow-lg z-10">
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ---- Summary Pill ----

function SummaryPill({
  label,
  value,
  color,
  onClick,
}: {
  label: string;
  value: number;
  color: "gray" | "green" | "amber" | "red" | "blue" | "purple";
  onClick?: () => void;
}) {
  const styles = {
    gray: "bg-gray-100 text-gray-600",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  }[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md transition-opacity hover:opacity-80",
        styles
      )}
    >
      {label}
      <span className="font-bold">{value}</span>
    </button>
  );
}

// ---- Status Dot ----

function StatusDot({
  status,
  type,
}: {
  status: string;
  type: "call" | "whatsapp" | "action";
}) {
  let color = "bg-gray-300";
  let label = status;

  if (type === "call") {
    if (status === "called") {
      color = "bg-emerald-500";
      label = "Called";
    } else if (status === "no_answer") {
      color = "bg-amber-500";
      label = "No Answer";
    } else if (status === "callback") {
      color = "bg-purple-500";
      label = "Callback";
    } else {
      label = "Not Called";
    }
  } else if (type === "whatsapp") {
    if (status === "sent") {
      color = "bg-emerald-500";
      label = "Sent";
    } else if (status === "replied") {
      color = "bg-blue-500";
      label = "Replied";
    } else if (status === "failed") {
      color = "bg-red-500";
      label = "Failed";
    } else {
      label = "Not Sent";
    }
  } else {
    if (status === "extended") {
      color = "bg-blue-500";
      label = "Extended";
    } else if (status === "returning") {
      color = "bg-indigo-500";
      label = "Returning";
    } else if (status === "closed") {
      color = "bg-emerald-500";
      label = "Closed";
    } else if (status === "immobilised") {
      color = "bg-red-500";
      label = "Immobilised";
    } else {
      label = "Pending";
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <span className={cn("w-2 h-2 rounded-full shrink-0", color)} />
      <span className="hidden xl:inline">{label}</span>
    </span>
  );
}

// ---- Filter Pill ----

function FilterPill({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  const active = value !== "all";
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none text-xs font-medium pl-2.5 pr-6 py-1.5 rounded-md border cursor-pointer focus:outline-none",
          active
            ? "bg-gray-900 border-gray-900 text-white"
            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
        )}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {label}: {o.l}
          </option>
        ))}
      </select>
      <ChevronDown
        className={cn(
          "w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none",
          active ? "text-white/60" : "text-gray-400"
        )}
      />
    </div>
  );
}

// ---- Contract Table Row ----

function ContractRow({
  contract,
  days,
  onAction,
  onSendWhatsApp,
}: {
  contract: ContractRow;
  days: number;
  onAction: (id: string, action: string, value: string) => void;
  onSendWhatsApp: (contract: ContractRow) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState(contract.notes || "");
  const menuRef = useRef<HTMLDivElement>(null);

  const isOverdue = contract.category === "over_due_closing";
  const isDone = contract.action_taken !== "none";

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const runAction = (action: string, value: string) => {
    onAction(contract.id, action, value);
    setMenuOpen(false);
  };

  return (
    <>
      <tr
        className={cn(
          "contract-row border-t border-gray-50 transition-colors",
          isDone && "opacity-50"
        )}
      >
        {/* Overdue indicator bar */}
        <td className="pl-4 pr-0 py-0">
          {isOverdue && (
            <div className="w-[3px] h-8 bg-red-500 rounded-full" />
          )}
        </td>

        {/* Contract # */}
        <td className="px-3 py-2.5">
          <span className="font-mono text-xs font-semibold text-gray-800">
            {contract.agreement_no}
          </span>
        </td>

        {/* Customer */}
        <td className="px-3 py-2.5">
          <div className="text-sm text-gray-800 truncate max-w-[160px]">
            {contract.customer_name || "-"}
          </div>
          {contract.contact_number && (
            <div className="text-[11px] text-gray-400">
              {contract.contact_number}
            </div>
          )}
        </td>

        {/* Vehicle */}
        <td className="px-3 py-2.5 hidden lg:table-cell text-gray-500 text-xs truncate max-w-[140px]">
          {contract.make_model || "-"}
        </td>

        {/* Plate */}
        <td className="px-3 py-2.5 hidden md:table-cell">
          {contract.vehicle_no ? (
            <span className="font-mono text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
              {contract.vehicle_no}
            </span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        {/* Days */}
        <td className="px-3 py-2.5 text-right">
          <span
            className={cn(
              "text-xs font-semibold",
              days > 0 ? "text-red-600" : days === 0 ? "text-amber-600" : "text-gray-500"
            )}
          >
            {days > 0 ? `${days}d` : days === 0 ? "Today" : `-${Math.abs(days)}d`}
          </span>
        </td>

        {/* Outstanding */}
        <td className="px-3 py-2.5 text-right hidden sm:table-cell">
          {contract.outstanding_amount > 0 ? (
            <span className="text-xs font-medium text-gray-800">
              {formatAED(contract.outstanding_amount)}
            </span>
          ) : (
            <span className="text-xs text-gray-300">-</span>
          )}
        </td>

        {/* Call status */}
        <td className="px-3 py-2.5 text-center">
          <StatusDot status={contract.call_status} type="call" />
        </td>

        {/* WA status */}
        <td className="px-3 py-2.5 text-center hidden sm:table-cell">
          <StatusDot status={contract.whatsapp_status} type="whatsapp" />
        </td>

        {/* Action status */}
        <td className="px-3 py-2.5 text-center">
          <StatusDot status={contract.action_taken} type="action" />
        </td>

        {/* Actions menu */}
        <td className="px-3 py-2.5 text-right">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-30 py-1">
                <div className="px-3 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Call Status
                </div>
                <MenuAction
                  icon={<Phone className="w-3.5 h-3.5" />}
                  label="Mark Called"
                  active={contract.call_status === "called"}
                  onClick={() => runAction("call_status", "called")}
                />
                <MenuAction
                  icon={<PhoneMissed className="w-3.5 h-3.5" />}
                  label="No Answer"
                  active={contract.call_status === "no_answer"}
                  onClick={() => runAction("call_status", "no_answer")}
                />
                <MenuAction
                  icon={<PhoneForwarded className="w-3.5 h-3.5" />}
                  label="Callback"
                  active={contract.call_status === "callback"}
                  onClick={() => runAction("call_status", "callback")}
                />

                <div className="border-t border-gray-100 my-1" />

                <div className="px-3 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  WhatsApp
                </div>
                <MenuAction
                  icon={<Send className="w-3.5 h-3.5" />}
                  label="Send WhatsApp"
                  active={contract.whatsapp_status === "sent"}
                  onClick={() => {
                    onSendWhatsApp(contract);
                    setMenuOpen(false);
                  }}
                />

                <div className="border-t border-gray-100 my-1" />

                <div className="px-3 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Contract Status
                </div>
                <MenuAction
                  icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                  label="Extended"
                  active={contract.action_taken === "extended"}
                  onClick={() => runAction("action_taken", "extended")}
                />
                <MenuAction
                  icon={<Car className="w-3.5 h-3.5" />}
                  label="Returning"
                  active={contract.action_taken === "returning"}
                  onClick={() => runAction("action_taken", "returning")}
                />
                <MenuAction
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  label="Closed"
                  active={contract.action_taken === "closed"}
                  onClick={() => runAction("action_taken", "closed")}
                />
                <MenuAction
                  icon={<Ban className="w-3.5 h-3.5" />}
                  label="Immobilised"
                  active={contract.action_taken === "immobilised"}
                  onClick={() => runAction("action_taken", "immobilised")}
                />

                <div className="border-t border-gray-100 my-1" />

                <MenuAction
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label={contract.notes ? "Edit Note" : "Add Note"}
                  onClick={() => {
                    setNoteOpen(true);
                    setMenuOpen(false);
                  }}
                />
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Note input row */}
      {noteOpen && (
        <tr className="border-t border-gray-50 bg-gray-50/50">
          <td colSpan={11} className="px-4 py-2">
            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && noteText.trim()) {
                    onAction(contract.id, "note", noteText.trim());
                    setNoteOpen(false);
                  }
                  if (e.key === "Escape") setNoteOpen(false);
                }}
                className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button
                onClick={() => {
                  if (noteText.trim()) {
                    onAction(contract.id, "note", noteText.trim());
                    setNoteOpen(false);
                  }
                }}
                className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800"
              >
                Save
              </button>
              <button
                onClick={() => setNoteOpen(false)}
                className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ---- Menu Action Item ----

function MenuAction({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
        active
          ? "text-gray-900 bg-gray-50 font-medium"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <span className={active ? "text-emerald-600" : "text-gray-400"}>
        {icon}
      </span>
      {label}
      {active && (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
      )}
    </button>
  );
}

// ---- Empty State ----

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="text-center py-24">
      <Upload className="w-10 h-10 text-gray-300 mx-auto mb-4" />
      <h2 className="text-base font-semibold text-gray-700 mb-1">
        No contracts loaded
      </h2>
      <p className="text-sm text-gray-400 mb-6">
        Upload an Excel export from Speed ERP to get started
      </p>
      <button
        onClick={onUpload}
        className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
      >
        Upload Data
      </button>
    </div>
  );
}
