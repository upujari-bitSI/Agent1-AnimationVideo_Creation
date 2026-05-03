"use client";

import { ToolOption } from "@/store/pipeline";

interface Props {
  tools: ToolOption[];
  selected: ToolOption | null;
  onSelect: (tool: ToolOption) => void;
}

const qualityLabel = (q: 1 | 2 | 3) =>
  q === 3 ? "Excellent" : q === 2 ? "Good" : "Basic";

const qualityColor = (q: 1 | 2 | 3) =>
  q === 3 ? "text-green-400" : q === 2 ? "text-amber-400" : "text-slate-400";

const speedIcon = (s: string) => (s === "fast" ? "⚡" : s === "medium" ? "⏱" : "🐢");

export default function ToolSelector({ tools, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {tools.map((tool) => {
        const isSelected = selected?.id === tool.id;
        const needsKey = tool.tier === "paid" && tool.credentialKey && !process.env[tool.credentialKey];

        const licenseTag = !tool.commercialOk
          ? { bg: "bg-red-900/50 border-red-700/60 text-red-300", label: "⚠ Not monetizable" }
          : tool.tier === "free"
          ? { bg: "bg-green-900/50 border-green-700/60 text-green-300", label: "✓ Free & commercial OK" }
          : { bg: "bg-blue-900/50 border-blue-700/60 text-blue-300", label: "✓ Commercial license" };

        return (
          <button
            key={tool.id}
            onClick={() => onSelect(tool)}
            className={`relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all cursor-pointer
              ${isSelected
                ? "border-blue-500 bg-blue-900/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60"
              }`}
          >
            {/* Tier badge */}
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                tool.tier === "free" ? "bg-slate-700 text-slate-300" : "bg-blue-700 text-blue-100"
              }`}>
                {tool.tier === "free" ? "Free" : "Paid"}
              </span>
              {isSelected && (
                <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
              )}
            </div>

            {/* Tool name */}
            <div className="font-bold text-slate-100 text-base" style={{ fontFamily: "var(--font-fredoka)" }}>
              {tool.name}
            </div>

            {/* Cost */}
            <div className="text-sm font-semibold text-slate-300">
              {tool.costPerUse}
              {tool.monthlyPlan && (
                <span className="text-slate-500 font-normal ml-1">({tool.monthlyPlan})</span>
              )}
            </div>

            {/* Metrics row */}
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>Quality: <span className={`font-semibold ${qualityColor(tool.quality)}`}>{qualityLabel(tool.quality)}</span></span>
              <span>{speedIcon(tool.speed)} {tool.speed}</span>
              {tool.requiresManual && <span className="text-amber-400">Manual</span>}
              {tool.apiSupported && <span className="text-green-400">Auto API</span>}
            </div>

            {/* License tag */}
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg border ${licenseTag.bg}`}>
              {licenseTag.label}
            </div>

            {/* No API key warning */}
            {needsKey && (
              <div className="text-xs text-amber-400 flex items-center gap-1">
                🔑 Add <code className="bg-slate-900 px-1 rounded">{tool.credentialKey}</code> in Settings
              </div>
            )}

            {/* Not-commercial persistent warning */}
            {!tool.commercialOk && isSelected && (
              <div className="mt-1 p-2 bg-red-900/60 border border-red-700 rounded-lg text-xs text-red-300 font-semibold">
                ⚠ Free tier — do NOT upload to YouTube for monetization
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
