"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  color: "amber" | "blue" | "emerald" | "red" | "purple" | "slate" | "orange";
  subtitle?: string;
  delay?: number;
}

const colorMap = {
  amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-500", border: "border-amber-100" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500", border: "border-blue-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-500", border: "border-emerald-100" },
  red: { bg: "bg-red-50", text: "text-red-700", icon: "text-red-500", border: "border-red-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", icon: "text-purple-500", border: "border-purple-100" },
  slate: { bg: "bg-slate-50", text: "text-slate-700", icon: "text-slate-500", border: "border-slate-100" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", icon: "text-orange-500", border: "border-orange-100" },
};

export function StatCard({ label, value, icon, color, subtitle, delay = 0 }: StatCardProps) {
  const c = colorMap[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "rounded-2xl border p-5 flex items-start gap-4",
        c.bg, c.border
      )}
    >
      <div className={cn("mt-0.5 flex-shrink-0", c.icon)}>{icon}</div>
      <div className="min-w-0">
        <div className={cn("text-3xl font-semibold tracking-tight", c.text)}>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: delay * 0.08 + 0.2 }}
          >
            {value}
          </motion.span>
        </div>
        <div className="text-sm text-slate-500 mt-0.5">{label}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
      </div>
    </motion.div>
  );
}
