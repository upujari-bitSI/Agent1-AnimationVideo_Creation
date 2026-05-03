"use client";

import { useState, useEffect } from "react";
import { usePipelineStore } from "@/store/pipeline";
import { TOOLS_BY_STEP } from "@/lib/agent/tools";
import { buildTitlesPrompt, parseTitlesOutput, TitleOption, TitlesOutput } from "@/lib/agent/steps/01-titles";
import StepCard from "@/components/StepCard";
import ToolSelector from "@/components/ToolSelector";
import TopicSelector, { THEMES } from "@/components/TopicSelector";
import HumanReviewPanel from "@/components/HumanReviewPanel";
import StreamingOutput from "@/components/StreamingOutput";

export default function Step01Titles() {
  const { steps, sessionId, setStepTool, setStepOutput, setStepStatus, approveStep, setCurrentStep, incrementRegenerate } = usePipelineStore();
  const step = steps.find((s) => s.id === "01-titles")!;

  // Restore from Zustand store so state survives navigation
  const stored = step.output as TitlesOutput | null;

  const [selectedThemes, setSelectedThemes] = useState<string[]>(stored?.themes ?? []);
  const [titles, setTitles] = useState<TitleOption[]>(stored?.titles ?? []);
  const [selectedTitle, setSelectedTitle] = useState<TitleOption | null>(stored?.selected ?? null);
  const [prompt, setPrompt] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  // Track whether streaming is in flight so we don't render a new StreamingOutput on re-render
  const [streamKey, setStreamKey] = useState(0);
  const [generating, setGenerating] = useState(false);

  const tools = TOOLS_BY_STEP["01-titles"];
  const titlesReady = titles.length > 0;

  // If already approved, keep it readonly
  const isApproved = step.status === "approved";

  function toggleTheme(id: string) {
    setSelectedThemes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  function startGeneration() {
    if (generating) return;
    const themeLabels = selectedThemes.map((id) => THEMES.find((t) => t.id === id)?.label || id);
    const p = buildTitlesPrompt(themeLabels);
    setPrompt(p);
    setTitles([]);
    setSelectedTitle(null);
    setParseError(null);
    setGenerating(true);
    setStreamKey((k) => k + 1); // new key forces StreamingOutput to remount fresh
  }

  function handleStreamComplete(raw: string) {
    setGenerating(false);
    try {
      const parsed = parseTitlesOutput(raw);
      if (parsed.length === 0) throw new Error("AI returned 0 titles — try again");
      setTitles(parsed);
      // Save themes + titles to store immediately (selected stays null until user picks)
      setStepOutput("01-titles", { themes: selectedThemes, titles: parsed, selected: null });
    } catch (e) {
      setParseError(`Could not parse AI output: ${e instanceof Error ? e.message : String(e)}`);
      setStepStatus("01-titles", "idle");
    }
  }

  function handleSelectTitle(t: TitleOption) {
    setSelectedTitle(t);
    // Persist selection to store immediately — not just on Approve —
    // so Step02 can read it even if the user navigates away and back
    setStepOutput("01-titles", { themes: selectedThemes, titles, selected: t });
  }

  function handleApprove() {
    if (!selectedTitle) return;
    // Store is already up to date from handleSelectTitle, just approve
    approveStep("01-titles");
  }

  function handleRegenerate() {
    incrementRegenerate("01-titles");
    setStepStatus("01-titles", "idle");
    startGeneration();
  }

  return (
    <StepCard step={step} isActive>
      <ToolSelector
        tools={tools}
        selected={step.selectedTool}
        onSelect={(t) => setStepTool("01-titles", t)}
      />

      {step.selectedTool && (
        <TopicSelector
          selectedThemes={selectedThemes}
          onThemeToggle={isApproved ? () => {} : toggleTheme}
          titles={titles}
          selectedTitle={selectedTitle}
          onSelectTitle={isApproved ? () => {} : handleSelectTitle}
        />
      )}

      {/* Generate button — show when no titles yet and not currently generating */}
      {step.selectedTool && selectedThemes.length > 0 && !titlesReady && !generating && (
        <button
          onClick={startGeneration}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
        >
          Generate Title Ideas →
        </button>
      )}

      {/* StreamingOutput — only shown while actively generating, hidden once titles arrive */}
      {generating && prompt && step.selectedTool?.apiSupported && (
        <StreamingOutput
          key={streamKey}
          sessionId={sessionId || ""}
          stepId="01-titles"
          prompt={prompt}
          onComplete={handleStreamComplete}
          autoStart
        />
      )}

      {parseError && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-xl text-sm text-red-300">
          <p className="font-bold mb-1">⚠ Generation error</p>
          <p>{parseError}</p>
          <button
            onClick={handleRegenerate}
            className="mt-2 px-4 py-1.5 bg-red-800 hover:bg-red-700 text-red-200 text-xs font-bold rounded-lg transition-all"
          >
            ↺ Try Again
          </button>
        </div>
      )}

      {step.selectedTool?.requiresManual && prompt && (
        <div className="p-4 bg-slate-800/60 border border-slate-600 rounded-xl text-sm text-slate-300 space-y-2">
          <p className="font-bold text-amber-300">Manual Step: Copy this prompt to {step.selectedTool.name}</p>
          <pre className="whitespace-pre-wrap text-xs bg-slate-900 p-3 rounded-lg overflow-auto">{prompt}</pre>
        </div>
      )}

      {/* Review panel — only shown when a title is selected */}
      {titlesReady && selectedTitle && !isApproved && (
        <HumanReviewPanel
          stepId="01-titles"
          output={selectedTitle}
          onAction={(action) => {
            if (action.type === "approve") handleApprove();
            else if (action.type === "regenerate") handleRegenerate();
            else if (action.type === "back") setCurrentStep(0);
          }}
        >
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400 mb-2 font-semibold">Selected title:</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedTitle.emoji}</span>
              <div>
                <h3 className="font-bold text-white text-lg" style={{ fontFamily: "var(--font-fredoka)" }}>
                  {selectedTitle.title}
                </h3>
                <p className="text-xs text-slate-400">{selectedTitle.ageRange} · ⭐ {selectedTitle.engagementScore}/10</p>
                <p className="text-xs text-slate-300 mt-1">{selectedTitle.hook}</p>
              </div>
            </div>
          </div>
        </HumanReviewPanel>
      )}

      {titlesReady && !selectedTitle && !generating && (
        <p className="text-sm text-amber-300 text-center py-2">
          👆 Click a title card above to select it, then approve to continue
        </p>
      )}

      {isApproved && selectedTitle && (
        <div className="p-4 bg-green-900/20 border border-green-700/40 rounded-xl flex items-center gap-3">
          <span className="text-2xl text-green-400">✓</span>
          <div>
            <p className="text-sm font-bold text-green-300">Approved</p>
            <p className="text-sm text-slate-300">{selectedTitle.emoji} {selectedTitle.title}</p>
          </div>
        </div>
      )}
    </StepCard>
  );
}
