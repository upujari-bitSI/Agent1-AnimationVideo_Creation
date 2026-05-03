"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePipelineStore, StepStatus } from "@/store/pipeline";
import { formatCost } from "@/lib/cost-tracker";
import { useState } from "react";

const STATUS_CONFIG: Record<StepStatus, { color: string; bg: string; icon: string; label: string }> = {
  idle:     { color: "text-slate-400",  bg: "bg-slate-700",   icon: "🔒", label: "Not started" },
  running:  { color: "text-blue-300",   bg: "bg-blue-600",    icon: "⚡", label: "AI running"  },
  review:   { color: "text-amber-300",  bg: "bg-amber-500",   icon: "👁", label: "Your review" },
  approved: { color: "text-green-300",  bg: "bg-green-600",   icon: "✓",  label: "Approved"    },
  error:    { color: "text-red-300",    bg: "bg-red-600",     icon: "✕",  label: "Error"       },
};

export default function PipelineTracker() {
  const { steps, currentStepIndex, setCurrentStep } = usePipelineStore();
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="w-12 flex flex-col items-center py-4 gap-3 border-r border-slate-800">
        <button onClick={() => setCollapsed(false)} className="text-slate-400 hover:text-slate-200 text-lg" title="Expand">›</button>
        {steps.map((step, i) => {
          const cfg = STATUS_CONFIG[step.status];
          const isCurrent = i === currentStepIndex;
          return (
            <button
              key={step.id}
              onClick={() => step.status !== "idle" && setCurrentStep(i)}
              title={step.name}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all
                ${cfg.bg} ${isCurrent ? "ring-2 ring-blue-400" : ""}`}
            >
              {cfg.icon}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 260, opacity: 1 }}
      className="w-64 flex-shrink-0 border-r border-slate-800 overflow-y-auto py-4 px-3"
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Pipeline</h2>
        <button onClick={() => setCollapsed(true)} className="text-slate-500 hover:text-slate-300 text-lg">‹</button>
      </div>

      <div className="relative flex flex-col gap-1">
        {steps.map((step, i) => {
          const cfg = STATUS_CONFIG[step.status];
          const isCurrent = i === currentStepIndex;
          const isClickable = step.status === "approved" || step.status === "review" || isCurrent;

          return (
            <div key={step.id} className="relative flex gap-3">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute left-[17px] top-9 w-0.5 h-[calc(100%-4px)] bg-slate-800 z-0" />
              )}

              {/* Step dot */}
              <div className="relative z-10 flex-shrink-0 mt-2">
                <motion.div
                  animate={step.status === "running" ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${cfg.bg} ${isCurrent ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-[#0B0F1A]" : ""}`}
                >
                  {step.status === "running" ? (
                    <span className="pulse-dot">{cfg.icon}</span>
                  ) : cfg.icon}
                </motion.div>
              </div>

              {/* Step info */}
              <button
                onClick={() => isClickable && setCurrentStep(i)}
                disabled={!isClickable}
                className={`flex-1 pb-4 text-left transition-all rounded-lg px-2 py-1
                  ${isCurrent ? "bg-blue-900/20" : ""}
                  ${isClickable ? "hover:bg-slate-800/50 cursor-pointer" : "cursor-default"}`}
              >
                <div className={`text-sm font-bold leading-tight ${isCurrent ? "text-white" : cfg.color}`}>
                  {step.name}
                </div>
                <div className={`text-xs mt-0.5 ${isCurrent ? "text-blue-300" : "text-slate-500"}`}>
                  {cfg.label}
                </div>
                <AnimatePresence>
                  {(step.status === "approved" || step.status === "review") && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-slate-500 mt-1 flex items-center gap-2"
                    >
                      {step.selectedTool && <span>{step.selectedTool.name}</span>}
                      {step.cost > 0 && <span className="text-green-400">{formatCost(step.cost)}</span>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
