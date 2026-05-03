"use client";

import { usePipelineStore } from "@/store/pipeline";
import { formatCost } from "@/lib/cost-tracker";

export default function CostEstimator() {
  const { totalCost, videosPerMonth, costs, monetization } = usePipelineStore();
  const projected = totalCost * videosPerMonth;

  const badge =
    monetization.overall
      ? { color: "bg-green-900 text-green-300 border-green-700", dot: "bg-green-400", label: "Ready to monetize" }
      : monetization.warnings.length < 3
      ? { color: "bg-amber-900 text-amber-300 border-amber-700", dot: "bg-amber-400", label: "Check licenses" }
      : { color: "bg-red-900 text-red-300 border-red-700", dot: "bg-red-400", label: "Not monetizable" };

  return (
    <div className="flex items-center gap-4 text-sm">
      {/* Monetization badge */}
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${badge.color}`}>
        <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
        {badge.label}
      </span>

      {/* Cost summary */}
      <div className="flex items-center gap-1 text-slate-400">
        <span className="text-slate-300 font-semibold">Session:</span>
        <span className="text-blue-300 font-bold">{formatCost(totalCost)}</span>
        <span className="mx-1 text-slate-600">|</span>
        <span className="text-slate-300 font-semibold">{videosPerMonth}x/mo:</span>
        <span className="text-purple-300 font-bold">~{formatCost(projected)}</span>
      </div>

      {costs.length > 0 && (
        <div className="hidden md:flex items-center gap-1">
          {costs.map((c) => (
            <span
              key={c.stepId}
              title={`${c.stepName}: ${formatCost(c.actualCost || c.estimatedCost)}`}
              className="w-2 h-2 rounded-full bg-blue-500 opacity-70"
            />
          ))}
        </div>
      )}
    </div>
  );
}
