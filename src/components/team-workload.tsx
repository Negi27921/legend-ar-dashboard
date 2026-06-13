"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TeamWorkload as TeamWorkloadType } from "@/lib/types";

interface TeamWorkloadProps {
  workload: TeamWorkloadType;
}

const teamColors: Record<string, { bar: string; label: string }> = {
  sree: { bar: "bg-blue-500", label: "Monitoring" },
  ann: { bar: "bg-purple-500", label: "Closure" },
  rachel: { bar: "bg-pink-500", label: "Refunds" },
  fairoos: { bar: "bg-orange-500", label: "Receivables" },
  karar: { bar: "bg-red-500", label: "Recovery" },
  ops: { bar: "bg-emerald-500", label: "Operations" },
};

export function TeamWorkload({ workload }: TeamWorkloadProps) {
  const maxTasks = Math.max(1, ...Object.values(workload).map(w => w.total));

  return (
    <div className="space-y-3">
      {Object.entries(workload).map(([name, data], idx) => {
        const team = teamColors[name] || { bar: "bg-slate-500", label: "" };
        const pct = (data.total / maxTasks) * 100;
        return (
          <motion.div
            key={name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.06 }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold capitalize">{name}</span>
                <span className="text-xs text-slate-400">{team.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {data.urgent > 0 && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100">
                    {data.urgent} urgent
                  </span>
                )}
                <span className="text-sm font-medium text-slate-600">{data.total}</span>
              </div>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", team.bar)}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, 8)}%` }}
                transition={{ duration: 0.6, delay: idx * 0.06 + 0.2, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
