"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Users, TrendingUp, AlertTriangle, Car, ArrowUpRight,
  MessageSquare, CreditCard, Shield, RefreshCw,
  ChevronRight, Activity, Zap, LayoutDashboard,
  ListTodo, Radio, Settings, Phone
} from "lucide-react";

import { StatCard } from "@/components/stat-card";
import { ContractsTable } from "@/components/contracts-table";
import { Timeline } from "@/components/timeline";
import { TeamWorkload } from "@/components/team-workload";
import { ReceivablesChart } from "@/components/receivables-chart";
import { EscalationQueue } from "@/components/escalation-queue";
import { TasksPanel } from "@/components/tasks-panel";

import {
  sampleContracts, sampleStats, sampleReceivables,
  sampleTasks, sampleEscalations, sampleTimeline, sampleWorkload
} from "@/lib/sample-data";
import { Contract, Task, Escalation, TimelineEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "overview" | "contracts" | "tasks" | "timeline";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [contracts, setContracts] = useState<Contract[]>(sampleContracts);
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [escalations, setEscalations] = useState<Escalation[]>(sampleEscalations);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(sampleTimeline);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefresh(new Date());
      showToast("Dashboard refreshed");
    }, 800);
  }, [showToast]);

  const handleOverride = useCallback((id: string, reason: string) => {
    setContracts(prev => prev.map(c =>
      c.id === id ? { ...c, manualOverride: true, overrideReason: reason, overrideUntil: null } : c
    ));
    showToast(`Override set for ${id}`);
    setTimeline(prev => [{
      id: `TL-${Date.now()}`, type: "event", contractId: id,
      detail: `Manual override set: ${reason}`, actor: "dashboard",
      time: new Date().toISOString(),
    }, ...prev]);
  }, [showToast]);

  const handleClearOverride = useCallback((id: string) => {
    setContracts(prev => prev.map(c =>
      c.id === id ? { ...c, manualOverride: false, overrideReason: null, overrideUntil: null } : c
    ));
    showToast(`Override cleared for ${id}`);
  }, [showToast]);

  const handleAction = useCallback((id: string, action: string) => {
    const contract = contracts.find(c => c.id === id);
    if (!contract) return;

    const actionLabels: Record<string, string> = {
      extend: "Extension link sent",
      return: "Return initiated",
      message: "Message sent",
      call: "Call triggered",
      close: "Contract force-closed",
    };

    showToast(`${actionLabels[action] || action} — ${id}`);
    setTimeline(prev => [{
      id: `TL-${Date.now()}`, type: "event", contractId: id,
      customerName: contract.customerName,
      detail: `${actionLabels[action] || action} via dashboard`,
      actor: "dashboard", time: new Date().toISOString(),
    }, ...prev]);

    if (action === "close") {
      setContracts(prev => prev.map(c => c.id === id ? { ...c, status: "closed" as const } : c));
    }
    if (action === "return") {
      setContracts(prev => prev.map(c => c.id === id ? { ...c, status: "closing" as const } : c));
    }
  }, [contracts, showToast]);

  const handleResolveEscalation = useCallback((id: string) => {
    setEscalations(prev => prev.filter(e => e.id !== id));
    showToast(`Escalation ${id} resolved`);
  }, [showToast]);

  const handleUpdateTaskStatus = useCallback((id: string, status: string) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: status as Task["status"], completedAt: status === "completed" ? new Date().toISOString() : null } : t
    ));
    showToast(`Task ${id} marked ${status}`);
  }, [showToast]);

  const tabs = [
    { id: "overview" as Tab, label: "Overview", icon: LayoutDashboard },
    { id: "contracts" as Tab, label: "Contracts", icon: Car },
    { id: "tasks" as Tab, label: "Tasks", icon: ListTodo },
    { id: "timeline" as Tab, label: "Timeline", icon: Radio },
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
              {tabs.map(t => (
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
                <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
                Live · {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
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
            {tabs.map(t => (
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
          {tab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard label="Expiring Today" value={sampleStats.expiringToday} icon={<Clock className="w-5 h-5" />} color="amber" delay={0} />
                <StatCard label="Contacted" value={sampleStats.contacted} icon={<MessageSquare className="w-5 h-5" />} color="blue" subtitle={`${sampleStats.messagesSent} messages sent`} delay={1} />
                <StatCard label="Responded" value={sampleStats.responded} icon={<ArrowUpRight className="w-5 h-5" />} color="emerald" delay={2} />
                <StatCard label="Overdue" value={sampleStats.overdue} icon={<AlertTriangle className="w-5 h-5" />} color="red" delay={3} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <StatCard label="Extended" value={sampleStats.extended} icon={<ArrowUpRight className="w-5 h-5" />} color="emerald" delay={4} />
                <StatCard label="Returning" value={sampleStats.returning} icon={<Car className="w-5 h-5" />} color="purple" delay={5} />
                <StatCard label="Total Active" value={sampleStats.totalContracts} icon={<Activity className="w-5 h-5" />} color="slate" delay={6} />
                <StatCard label="Immobilised" value={sampleStats.immobilised} icon={<Shield className="w-5 h-5" />} color="orange" delay={7} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Open Receivables</h2>
                    <CreditCard className="w-4 h-4 text-slate-300" />
                  </div>
                  <ReceivablesChart data={sampleReceivables} />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }} className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Escalation Queue</h2>
                    <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", escalations.length > 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200")}>{escalations.length}</span>
                  </div>
                  <EscalationQueue escalations={escalations} onResolve={handleResolveEscalation} />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }} className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Team Workload</h2>
                    <Users className="w-4 h-4 text-slate-300" />
                  </div>
                  <TeamWorkload workload={sampleWorkload} />
                </motion.div>
              </div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 }} className="mt-6 bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Recent Activity</h2>
                  <button onClick={() => setTab("timeline")} className="text-xs text-amber-600 font-medium hover:text-amber-700 flex items-center gap-1">View All <ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
                <Timeline events={timeline.slice(0, 6)} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.7 }} className="mt-6 bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">System Controls</h2>
                  <Settings className="w-4 h-4 text-slate-300" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Run Daily Monitoring", desc: "Fetch Speed data, classify, dispatch messages", icon: Zap, color: "amber" as const },
                    { label: "Run Escalation Check", desc: "Check 2hr/4hr no-response triggers", icon: AlertTriangle, color: "orange" as const },
                    { label: "Run Recovery Cycle", desc: "Post-closure follow-up sequence", icon: TrendingUp, color: "blue" as const },
                  ].map((ctrl) => (
                    <button
                      key={ctrl.label}
                      onClick={() => showToast(`${ctrl.label} — triggered successfully`)}
                      className={cn(
                        "p-4 rounded-xl border-2 border-dashed text-left transition-all hover:shadow-md group",
                        ctrl.color === "amber" && "border-amber-200 hover:border-amber-400 hover:bg-amber-50",
                        ctrl.color === "orange" && "border-orange-200 hover:border-orange-400 hover:bg-orange-50",
                        ctrl.color === "blue" && "border-blue-200 hover:border-blue-400 hover:bg-blue-50",
                      )}
                    >
                      <ctrl.icon className={cn("w-5 h-5 mb-2 transition-transform group-hover:scale-110", ctrl.color === "amber" && "text-amber-500", ctrl.color === "orange" && "text-orange-500", ctrl.color === "blue" && "text-blue-500")} />
                      <div className="text-sm font-semibold text-slate-700">{ctrl.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{ctrl.desc}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {tab === "contracts" && (
            <motion.div key="contracts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">All Contracts</h2>
                <div className="text-sm text-slate-400">{contracts.length} total</div>
              </div>
              <ContractsTable contracts={contracts} onOverride={handleOverride} onClearOverride={handleClearOverride} onAction={handleAction} />
            </motion.div>
          )}

          {tab === "tasks" && (
            <motion.div key="tasks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">Team Tasks</h2>
                <div className="text-sm text-slate-400">{tasks.filter(t => t.status === "open" || t.status === "in_progress").length} open</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <TasksPanel tasks={tasks} onUpdateStatus={handleUpdateTaskStatus} />
              </div>
            </motion.div>
          )}

          {tab === "timeline" && (
            <motion.div key="timeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">Communication Timeline</h2>
                <div className="text-sm text-slate-400">{timeline.length} events today</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <Timeline events={timeline} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
