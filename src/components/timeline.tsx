"use client";

import { motion } from "framer-motion";
import { cn, formatTime } from "@/lib/utils";
import { TimelineEvent } from "@/lib/types";
import { ArrowUpRight, ArrowDownLeft, Bell, CreditCard, PhoneCall } from "lucide-react";

interface TimelineProps {
  events: TimelineEvent[];
}

const typeConfig = {
  message: { outbound: { icon: ArrowUpRight, bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" }, inbound: { icon: ArrowDownLeft, bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" } },
  event: { icon: Bell, bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
  payment: { icon: CreditCard, bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-500" },
  call: { icon: PhoneCall, bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500" },
};

export function Timeline({ events }: TimelineProps) {
  return (
    <div className="space-y-1">
      {events.map((event, idx) => {
        let config;
        if (event.type === "message") {
          config = event.direction === "inbound" ? typeConfig.message.inbound : typeConfig.message.outbound;
        } else {
          config = typeConfig[event.type] || typeConfig.event;
        }
        const Icon = config.icon;

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.03 }}
            className={cn(
              "flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors hover:shadow-sm",
              config.bg, config.border
            )}
          >
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-white/80")}>
              <Icon className={cn("w-3.5 h-3.5", `text-${config.dot.replace("bg-", "")}`)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-sm text-slate-700">{event.detail}</span>
                  {event.customerName && (
                    <span className="text-xs text-slate-400 ml-2">— {event.customerName}</span>
                  )}
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                  {formatTime(event.time)}
                </span>
              </div>
              {event.contractId && (
                <div className="text-xs text-slate-400 mt-0.5 font-mono">{event.contractId}</div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
