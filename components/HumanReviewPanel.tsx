"use client";

import { useState } from "react";
import { usePipelineStore } from "@/store/pipeline";

export type ReviewAction =
  | { type: "approve" }
  | { type: "edit"; changes: unknown }
  | { type: "regenerate"; instructions?: string }
  | { type: "regenerate-partial"; indices: number[] }
  | { type: "back" };

interface Props {
  stepId: string;
  output: unknown;
  onAction: (action: ReviewAction) => void;
  editingEnabled?: boolean;
  children?: React.ReactNode;
}

export default function HumanReviewPanel({ stepId, output, onAction, editingEnabled = true, children }: Props) {
  const { steps } = usePipelineStore();
  const step = steps.find((s) => s.id === stepId);
  const [regenInstructions, setRegenInstructions] = useState("");
  const [showRegen, setShowRegen] = useState(false);
  const [notes, setNotes] = useState(step?.notes || "");
  const { setStepNotes } = usePipelineStore();

  const handleApprove = () => {
    if (notes !== step?.notes) setStepNotes(stepId, notes);
    onAction({ type: "approve" });
  };

  const handleRegen = () => {
    onAction({ type: "regenerate", instructions: regenInstructions });
    setRegenInstructions("");
    setShowRegen(false);
  };

  if (!output) return null;

  return (
    <div className="border border-amber-700/40 bg-amber-900/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-amber-900/20 border-b border-amber-700/30">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-400 rounded-full pulse-dot" />
          <span className="text-amber-300 font-bold text-sm">Awaiting your review</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {step && step.regenerateCount > 0 && (
            <span>Regenerated {step.regenerateCount}x</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">{children}</div>

      {/* Notes */}
      <div className="px-4 pb-3">
        <label className="block text-xs text-slate-400 mb-1 font-semibold">Step notes (carries to next steps)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes for yourself..."
          className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-slate-500"
          rows={2}
        />
      </div>

      {/* Regen instructions */}
      {showRegen && (
        <div className="px-4 pb-3 space-y-2">
          <label className="block text-xs text-slate-400 font-semibold">Tell Claude what to fix (optional):</label>
          <textarea
            value={regenInstructions}
            onChange={(e) => setRegenInstructions(e.target.value)}
            placeholder="e.g. Make the lyrics more rhyme-heavy, change the tempo to lullaby style..."
            className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-blue-500"
            rows={3}
          />
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/40 border-t border-slate-700/40">
        {/* Approve */}
        <button
          onClick={handleApprove}
          className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <span>✓</span> Approve & Continue
        </button>

        {/* Regenerate */}
        {!showRegen ? (
          <button
            onClick={() => setShowRegen(true)}
            className="px-4 py-2.5 bg-blue-800/60 hover:bg-blue-700/60 text-blue-200 font-semibold rounded-xl transition-all text-sm border border-blue-700/40"
          >
            ↺ Regenerate
          </button>
        ) : (
          <button
            onClick={handleRegen}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all text-sm"
          >
            Send ↺
          </button>
        )}

        {/* Edit */}
        {editingEnabled && (
          <button
            onClick={() => onAction({ type: "edit", changes: output })}
            className="px-4 py-2.5 bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 font-semibold rounded-xl transition-all text-sm border border-slate-600/40"
          >
            ✏ Edit
          </button>
        )}

        {/* Back */}
        <button
          onClick={() => onAction({ type: "back" })}
          className="px-3 py-2.5 text-slate-400 hover:text-slate-200 transition-colors text-sm"
          title="Go back to previous step"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
