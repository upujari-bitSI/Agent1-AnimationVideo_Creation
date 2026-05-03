"use client";

import { useState } from "react";

interface Props {
  toolName: string;
  prompt: string;
  /** Label shown above the paste area, e.g. "Paste the JSON array ChatGPT returned:" */
  pasteLabel?: string;
  /** Placeholder text in the textarea */
  placeholder?: string;
  onSubmit: (raw: string) => void;
  onRegen?: () => void;
}

export default function ManualPastePanel({ toolName, prompt, pasteLabel, placeholder, onSubmit, onRegen }: Props) {
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);

  function copyPrompt() {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSubmit() {
    const raw = pasted.trim();
    if (!raw) { setError("Please paste the response first."); return; }
    setError(null);
    onSubmit(raw);
  }

  return (
    <div className="space-y-4 p-4 bg-slate-800/50 border border-amber-700/40 rounded-xl">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
        <span className="text-sm font-semibold text-amber-300">Copy this prompt and paste it into <strong>{toolName}</strong></span>
      </div>

      {/* Prompt box */}
      <div className="relative">
        <pre className="whitespace-pre-wrap text-xs bg-slate-900 border border-slate-700 p-3 rounded-lg overflow-auto max-h-48 text-slate-300 leading-relaxed">
          {prompt}
        </pre>
        <button
          onClick={copyPrompt}
          className={`absolute top-2 right-2 px-2.5 py-1 text-xs font-bold rounded-lg transition-all
            ${copied ? "bg-green-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-300"}`}
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
        <span className="text-sm font-semibold text-blue-300">Paste the response from {toolName} below</span>
      </div>

      <div>
        {pasteLabel && <p className="text-xs text-slate-400 mb-1.5 font-semibold">{pasteLabel}</p>}
        <textarea
          value={pasted}
          onChange={(e) => { setPasted(e.target.value); setError(null); }}
          placeholder={placeholder || "Paste the AI response here…"}
          rows={8}
          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 font-mono resize-y focus:outline-none focus:border-blue-500 leading-relaxed"
        />
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={!pasted.trim()}
          className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-sm"
        >
          Parse &amp; Show Results →
        </button>
        {onRegen && (
          <button
            onClick={onRegen}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-xl transition-all text-sm border border-slate-600"
          >
            ↺ New Prompt
          </button>
        )}
      </div>
    </div>
  );
}
