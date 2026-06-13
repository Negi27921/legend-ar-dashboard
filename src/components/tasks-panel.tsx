"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Task, TeamMember } from "@/lib/types";
import { CheckCircle2, Circle, Clock, AlertTriangle, User } from "lucide-react";

interface TasksPanelProps {
  tasks: Task[];
  onUpdateStatus: (id: string, status: string) => void;
}

const priorityConfig: Record<string, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  urgent: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  high: { icon: Clock, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  normal: { icon: Circle, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  low: { icon: Circle, color: "text-slate-400", bg: "bg-slate-50 border-slate-200" },
};

export function TasksPanel({ tasks, onUpdateStatus }: TasksPanelProps) {
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const assignees = ["all", ...new Set(tasks.map(t => t.assignedTo))];

  const filtered = filterAssignee === "all" ? tasks : tasks.filter(t => t.assignedTo === filterAssignee);
  const open = filtered.filter(t => t.status === "open" || t.status === "in_progress");

  return (
    <div>
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {assignees.map(a => (
          <button
            key={a}
            onClick={() => setFilterAssignee(a)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
              filterAssignee === a
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
            )}
          >
            {a === "all" ? "All" : a.charAt(0).toUpperCase() + a.slice(1)}
            {a !== "all" && <span className="ml-1 opacity-60">({tasks.filter(t => t.assignedTo === a && (t.status === "open" || t.status === "in_progress")).length})</span>}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {open.map((task, idx) => {
            const priority = priorityConfig[task.priority] || priorityConfig.normal;
            const PriorityIcon = priority.icon;
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.25, delay: idx * 0.03 }}
                className={cn("rounded-xl border p-4", priority.bg)}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => onUpdateStatus(task.id, "completed")}
                    className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
                  >
                    {task.status === "in_progress" ? (
                      <Clock className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 hover:text-emerald-500" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <PriorityIcon className={cn("w-3.5 h-3.5", priority.color)} />
                      <span className={cn("text-xs font-semibold uppercase", priority.color)}>{task.priority}</span>
                      <span className="text-xs text-slate-400 capitalize">· {task.taskType.replace(/_/g, " ")}</span>
                    </div>
                    <div className="text-sm text-slate-700">{task.description}</div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.assignedTo}</span>
                      {task.contractId && <span className="font-mono">{task.contractId}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateStatus(task.id, "completed")}
                    className="px-2.5 py-1 text-xs font-medium bg-white/80 border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all flex-shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {open.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <div className="text-sm">All tasks completed</div>
        </div>
      )}
    </div>
  );
}
