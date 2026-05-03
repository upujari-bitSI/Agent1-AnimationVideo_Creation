"use client";

import { useState } from "react";
import { usePipelineStore } from "@/store/pipeline";
import { TOOLS_BY_STEP } from "@/lib/agent/tools";
import { buildTitlesPrompt, parseTitlesOutput, TitleOption } from "@/lib/agent/steps/01-titles";
import StepCard from "@/components/StepCard";
import ToolSelector from "@/components/ToolSelector";
import TopicSelector, { THEMES } from "@/components/TopicSelector";
import HumanReviewPanel from "@/components/HumanReviewPanel";
import StreamingOutput from "@/components/StreamingOutput";

export default function Step01Titles() {
  const { steps, sessionId, setStepTool, setStepOutput, setStepStatus, approveStep, setCurrentStep, setStreamingText, incrementRegenerate } = usePipelineStore();
  const step = steps.find((s) => s.id === "01-titles")!;

  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [titles, setTitles] = useState<TitleOption[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<TitleOption | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const tools = TOOLS_BY_STEP["01-titles"];

  function toggleTheme(id: string) {
    setSelectedThemes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  function buildPrompt() {
    const themeLabels = selectedThemes.map((id) => THEMES.find((t) => t.id === id)?.label || id);
    const p = buildTitlesPrompt(themeLabels);
    setPrompt(p);
    setStreamingText("");
    setTitles([]);
    setParseError(null);
  }

  function handleStreamComplete(raw: string) {
    try {
      const parsed = parseTitlesOutput(raw);
      setTitles(parsed);
      setStepOutput("01-titles", { themes: selectedThemes, titles: parsed, selected: null });
    } catch (e) {
      setParseError(`Could not parse AI output: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function handleApprove() {
    if (!selectedTitle) return;
    setStepOutput("01-titles", { themes: selectedThemes, titles, selected: selectedTitle });
    approveStep("01-titles");
  }

  function handleRegenerate() {
    incrementRegenerate("01-titles");
    setStepStatus("01-titles", "idle");
    setTitles([]);
    setSelectedTitle(null);
    buildPrompt();
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
          onThemeToggle={toggleTheme}
          titles={titles}
          selectedTitle={selectedTitle}
          onSelectTitle={setSelectedTitle}
        />
      )}

      {step.selectedTool && selectedThemes.length > 0 && !prompt && (
        <button
          onClick={buildPrompt}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
        >
          Generate Title Ideas →
        </button>
      )}

      {prompt && step.selectedTool?.apiSupported && (
        <StreamingOutput
          sessionId={sessionId || ""}
          stepId="01-titles"
          prompt={prompt}
          onComplete={handleStreamComplete}
          autoStart
        />
      )}

      {parseError && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-xl text-sm text-red-300">{parseError}</div>
      )}

      {step.selectedTool?.requiresManual && prompt && (
        <div className="p-4 bg-slate-800/60 border border-slate-600 rounded-xl text-sm text-slate-300 space-y-2">
          <p className="font-bold text-amber-300">Manual Step: Copy this prompt to {step.selectedTool.name}</p>
          <pre className="whitespace-pre-wrap text-xs bg-slate-900 p-3 rounded-lg overflow-auto">{prompt}</pre>
        </div>
      )}

      {titles.length > 0 && selectedTitle && (
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
            <p className="text-xs text-slate-400 mb-2 font-semibold">Selected Title:</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedTitle.emoji}</span>
              <div>
                <h3 className="font-bold text-white text-lg" style={{ fontFamily: "var(--font-fredoka)" }}>{selectedTitle.title}</h3>
                <p className="text-xs text-slate-400">{selectedTitle.ageRange} · ⭐ {selectedTitle.engagementScore}/10</p>
                <p className="text-xs text-slate-300 mt-1">{selectedTitle.hook}</p>
              </div>
            </div>
          </div>
        </HumanReviewPanel>
      )}
    </StepCard>
  );
}
