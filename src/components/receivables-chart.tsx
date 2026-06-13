"use client";

import { motion } from "framer-motion";
import { cn, formatAED } from "@/lib/utils";
import { Receivables } from "@/lib/types";

interface ReceivablesChartProps {
  data: Receivables;
}

const bucketColors: Record<string, { bg: string; fill: string; label: string }> = {
  "0": { bg: "bg-emerald-100", fill: "bg-emerald-500", label: "Current" },
  "1-3": { bg: "bg-amber-100", fill: "bg-amber-500", label: "1-3 days" },
  "4-7": { bg: "bg-orange-100", fill: "bg-orange-500", label: "4-7 days" },
  "8-14": { bg: "bg-red-100", fill: "bg-red-500", label: "8-14 days" },
  "15+": { bg: "bg-red-200", fill: "bg-red-700", label: "15+ days" },
};

export function ReceivablesChart({ data }: ReceivablesChartProps) {
  const total = Object.values(data.byDaysOverdue).reduce((s, v) => s + v, 0) || 1;

  return (
    <div>
      <div className="text-center mb-5">
        <motion.div
          className="text-4xl font-bold text-slate-800"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {formatAED(data.totalAed)}
        </motion.div>
        <div className="text-sm text-slate-400 mt-1">{data.totalCount} contracts with outstanding</div>
      </div>

      <div className="flex gap-1 h-5 rounded-full overflow-hidden mb-4">
        {Object.entries(data.byDaysOverdue).map(([key, count], idx) => {
          const bucket = bucketColors[key];
          return (
            <motion.div
              key={key}
              className={cn("rounded-full", bucket.fill)}
              initial={{ flex: 0 }}
              animate={{ flex: count || 0.001 }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              title={`${bucket.label}: ${count}`}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
        {Object.entries(data.byDaysOverdue).map(([key, count]) => {
          const bucket = bucketColors[key];
          return (
            <div key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className={cn("w-2.5 h-2.5 rounded-full", bucket.fill)} />
              <span>{bucket.label}: <span className="font-medium text-slate-700">{count}</span></span>
            </div>
          );
        })}
      </div>

      {data.byOwner.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-400 mb-2 font-medium">BY OWNER</div>
          <div className="space-y-1.5">
            {data.byOwner.filter(o => o.total > 0).map(owner => (
              <div key={owner.name} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{owner.name}</span>
                <span className="font-medium text-slate-800">{formatAED(owner.total)} <span className="text-xs text-slate-400">({owner.count})</span></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
