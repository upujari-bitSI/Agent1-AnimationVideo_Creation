"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { PipelineStep } from "@/store/pipeline";

interface Props {
  step: PipelineStep;
  isActive: boolean;
  children: ReactNode;
}

const statusBorder: Record<string, string> = {
  idle:     "border-slate-700/50",
  running:  "border-blue-500/60 glow-active",
  review:   "border-amber-500/60",
  approved: "border-green-500/40",
  error:    "border-red-500/60",
};

const statusHeader: Record<string, string> = {
  idle:     "bg-slate-800/50",
  running:  "bg-blue-900/30",
  review:   "bg-amber-900/20",
  approved: "bg-green-900/20",
  error:    "bg-red-900/20",
};

export default function StepCard({ step, isActive, children }: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`rounded-2xl border-2 overflow-hidden transition-all duration-300
        ${statusBorder[step.status]}
        ${!isActive ? "opacity-50 pointer-events-none" : ""}`}
      style={{ backgroundColor: "var(--bg-card)" }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 border-b border-slate-700/40 ${statusHeader[step.status]}`}>
        <div className="flex items-center gap-3">
          <StatusDot status={step.status} />
          <div>
            <h2 className="text-lg font-bold text-white leading-tight" style={{ fontFamily: "var(--font-fredoka)" }}>
              {step.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500 flex-shrink-0 ml-4">
          <div>{step.estimatedTime}</div>
          {step.selectedTool && (
            <div className="text-slate-400 mt-0.5">{step.selectedTool.name}</div>
          )}
        </div>
      </div>

      {/* Body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="p-5 space-y-4"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "running") {
    return (
      <div className="w-3 h-3 bg-blue-400 rounded-full pulse-dot" />
    );
  }
  const colors: Record<string, string> = {
    idle: "bg-slate-600",
    review: "bg-amber-400",
    approved: "bg-green-400",
    error: "bg-red-400",
  };
  return <div className={`w-3 h-3 rounded-full ${colors[status] || "bg-slate-600"}`} />;
}
