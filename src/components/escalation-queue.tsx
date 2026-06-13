"use client";

import { motion } from "framer-motion";
import { cn, formatTime } from "@/lib/utils";
import { Escalation } from "@/lib/types";
import { AlertTriangle, Phone, CheckCircle2, Clock } from "lucide-react";

interface EscalationQueueProps {
  escalations: Escalation[];
  onResolve: (id: string) => void;
}

export function EscalationQueue({ escalations, onResolve }: EscalationQueueProps) {
  if (escalations.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <div className="text-sm">No pending escalations</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {escalations.map((esc, idx) => {
        const is4hr = esc.escalationType.includes("4hr");
        return (
          <motion.div
            key={esc.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className={cn(
              "rounded-xl border p-4",
              is4hr ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  is4hr ? "bg-red-100" : "bg-amber-100"
                )}>
                  <AlertTriangle className={cn("w-4 h-4", is4hr ? "text-red-600" : "text-amber-600")} />
                </div>
                <div>
                  <div className="font-medium text-sm">{esc.customerName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{esc.vehicle}</div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {esc.customerPhone}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(esc.triggerTime)}</span>
                  </div>
                  <div className={cn(
                    "inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-2",
                    is4hr ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {esc.escalationType.replace(/_/g, " ")}
                  </div>
                  {esc.callOutcome && (
                    <span className="ml-2 text-xs text-slate-500">Call: {esc.callOutcome}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onResolve(esc.id)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all flex-shrink-0"
              >
                Resolve
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
