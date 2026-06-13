"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatAED, formatDate } from "@/lib/utils";
import { Contract } from "@/lib/types";
import {
  Car, Phone, Mail, Shield, ShieldOff, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Search, Filter, MoreHorizontal,
  Send, ArrowLeftRight, Ban, CheckCircle2
} from "lucide-react";

interface ContractsTableProps {
  contracts: Contract[];
  onOverride: (id: string, reason: string) => void;
  onClearOverride: (id: string) => void;
  onAction: (id: string, action: string) => void;
}

const tierConfig: Record<string, { label: string; color: string; bg: string }> = {
  tier1: { label: "Expiring Today", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  tier2: { label: "Expiring Soon", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  tier3: { label: "Overdue 1-3d", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  tier4: { label: "Overdue 4d+", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  aggregator: { label: "Aggregator", color: "text-slate-600", bg: "bg-slate-100 border-slate-200" },
  override: { label: "Override", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  active: { label: "Active", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
};

const statusConfig: Record<string, { label: string; dot: string }> = {
  active: { label: "Active", dot: "bg-emerald-500" },
  extended: { label: "Extended", dot: "bg-blue-500" },
  overdue: { label: "Overdue", dot: "bg-red-500" },
  closing: { label: "Returning", dot: "bg-purple-500" },
  closed: { label: "Closed", dot: "bg-slate-400" },
  immobilised: { label: "Immobilised", dot: "bg-red-700" },
};

export function ContractsTable({ contracts, onOverride, onClearOverride, onAction }: ContractsTableProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const filtered = contracts.filter(c => {
    const matchesSearch = !search ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.vehiclePlate.toLowerCase().includes(search.toLowerCase()) ||
      c.vehicleModel.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || c.tier === filter || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search contracts, customers, plates..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <optgroup label="Tier">
              <option value="tier1">Expiring Today</option>
              <option value="tier2">Expiring Soon</option>
              <option value="tier3">Overdue 1-3d</option>
              <option value="tier4">Overdue 4d+</option>
              <option value="aggregator">Aggregator</option>
            </optgroup>
            <optgroup label="Status">
              <option value="overdue">Overdue</option>
              <option value="active">Active</option>
              <option value="closing">Returning</option>
            </optgroup>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((contract, idx) => {
            const tier = tierConfig[contract.tier] || tierConfig.active;
            const status = statusConfig[contract.status] || statusConfig.active;
            const isExpanded = expandedId === contract.id;
            const totalOutstanding = contract.outstandingAmount + contract.salikCharges + contract.fineCharges + contract.darbCharges;

            return (
              <motion.div
                key={contract.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
                className={cn(
                  "rounded-xl border bg-white overflow-hidden transition-shadow",
                  contract.manualOverride ? "border-purple-300 ring-1 ring-purple-100" : "border-slate-200",
                  isExpanded && "shadow-lg shadow-slate-200/50"
                )}
              >
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : contract.id)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", status.dot)} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-slate-800">{contract.id}</span>
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", tier.bg, tier.color)}>{tier.label}</span>
                        {contract.manualOverride && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Override
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 mt-0.5 truncate">{contract.customerName}</div>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-6 text-sm text-slate-500 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5" />
                      <span>{contract.vehicleModel.split(" ").slice(0, 2).join(" ")}</span>
                    </div>
                    <div className="w-24 text-right">
                      <span className="text-xs text-slate-400">Plate</span>
                      <div className="font-mono text-xs">{contract.vehiclePlate}</div>
                    </div>
                    <div className="w-20 text-right">
                      <span className="text-xs text-slate-400">End</span>
                      <div className="text-xs">{formatDate(contract.endDate)}</div>
                    </div>
                    {totalOutstanding > 0 && (
                      <div className="w-28 text-right">
                        <span className="text-xs text-slate-400">Outstanding</span>
                        <div className="font-semibold text-red-600 text-sm">{formatAED(totalOutstanding)}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="relative">
                      <button
                        onClick={e => { e.stopPropagation(); setActionMenu(actionMenu === contract.id ? null : contract.id); }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </button>
                      <AnimatePresence>
                        {actionMenu === contract.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-52"
                          >
                            <button onClick={e => { e.stopPropagation(); onAction(contract.id, "extend"); setActionMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><ArrowLeftRight className="w-3.5 h-3.5" /> Send Extension Link</button>
                            <button onClick={e => { e.stopPropagation(); onAction(contract.id, "return"); setActionMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Car className="w-3.5 h-3.5" /> Initiate Return</button>
                            <button onClick={e => { e.stopPropagation(); onAction(contract.id, "message"); setActionMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Send className="w-3.5 h-3.5" /> Send Message</button>
                            <button onClick={e => { e.stopPropagation(); onAction(contract.id, "call"); setActionMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Trigger Call</button>
                            <div className="border-t border-slate-100 my-1" />
                            {contract.manualOverride ? (
                              <button onClick={e => { e.stopPropagation(); onClearOverride(contract.id); setActionMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-purple-600"><ShieldOff className="w-3.5 h-3.5" /> Clear Override</button>
                            ) : (
                              <button onClick={e => { e.stopPropagation(); onOverride(contract.id, "Manual override from dashboard"); setActionMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-purple-600"><Shield className="w-3.5 h-3.5" /> Set Override</button>
                            )}
                            <button onClick={e => { e.stopPropagation(); onAction(contract.id, "close"); setActionMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"><Ban className="w-3.5 h-3.5" /> Force Close</button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Customer</div>
                          <div className="font-medium">{contract.customerName}</div>
                          <div className="flex items-center gap-1 text-slate-500 mt-1"><Phone className="w-3 h-3" /> {contract.customerPhone || "—"}</div>
                          <div className="flex items-center gap-1 text-slate-500"><Mail className="w-3 h-3" /> {contract.customerEmail || "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Vehicle</div>
                          <div className="font-medium">{contract.vehicleModel}</div>
                          <div className="font-mono text-slate-500">{contract.vehiclePlate}</div>
                          <div className="text-slate-500 capitalize">{contract.contractType} · {contract.sourceCode}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Financials</div>
                          <div className="space-y-0.5">
                            <div>Rate: <span className="font-medium">{formatAED(contract.dailyRate)}/day</span></div>
                            {contract.salikCharges > 0 && <div>Salik: <span className="text-orange-600">{formatAED(contract.salikCharges)}</span></div>}
                            {contract.fineCharges > 0 && <div>Fines: <span className="text-red-600">{formatAED(contract.fineCharges)}</span></div>}
                            <div>Deposit: {formatAED(contract.depositAmount)}</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Dates & Status</div>
                          <div>Start: {formatDate(contract.startDate)}</div>
                          <div>End: <span className="font-medium">{formatDate(contract.endDate)}</span></div>
                          <div className="flex items-center gap-1 mt-1">
                            <div className={cn("w-2 h-2 rounded-full", status.dot)} />
                            <span className="capitalize">{status.label}</span>
                          </div>
                          {contract.assignedTo && <div className="text-slate-400 text-xs mt-0.5">Assigned: {contract.assignedTo}</div>}
                        </div>
                        {contract.manualOverride && (
                          <div className="col-span-full bg-purple-50 rounded-lg p-3 border border-purple-100">
                            <div className="flex items-center gap-2 text-purple-700 font-medium text-xs">
                              <Shield className="w-3.5 h-3.5" /> MANUAL OVERRIDE ACTIVE
                            </div>
                            <div className="text-sm text-purple-600 mt-1">{contract.overrideReason}</div>
                            {contract.overrideUntil && <div className="text-xs text-purple-400 mt-0.5">Until: {formatDate(contract.overrideUntil)}</div>}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <div>No contracts match your search</div>
        </div>
      )}
    </div>
  );
}
