"use client";

import { useState } from "react";
import { usePipelineStore } from "@/store/pipeline";
import { TOOLS_BY_STEP } from "@/lib/agent/tools";
import { buildTitlesPrompt, parseTitlesOutput, TitleOption, TitlesOutput } from "@/lib/agent/steps/01-titles";
import StepCard from "@/components/StepCard";
import ToolSelector from "@/components/ToolSelector";
import TopicSelector, { THEMES } from "@/components/TopicSelector";
import HumanReviewPanel from "@/components/HumanReviewPanel";
import StreamingOutput from "@/components/StreamingOutput";
import ManualPastePanel from "@/components/ManualPastePanel";

export default function Step01Titles() {
  const { steps, sessionId, setStepTool, setStepOutput, setStepStatus, approveStep, setCurrentStep, incrementRegenerate } = usePipelineStore();
  const step = steps.find((s) => s.id === "01-titles")!;

  const stored = step.output as TitlesOutput | null;
  const [selectedThemes, setSelectedThemes] = useState<string[]>(stored?.themes ?? []);
  const [titles, setTitles] = useState<TitleOption[]>(stored?.titles ?? []);
  const [selectedTitle, setSelectedTitle] = useState<TitleOption | null>(stored?.selected ?? null);
  const [prompt, setPrompt] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [streamKey, setStreamKey] = useState(0);
  const [generating, setGenerating] = useState(false);

  const tools = TOOLS_BY_STEP["01-titles"];
  const titlesReady = titles.length > 0;
  const isApproved = step.status === "approved";
  const isManual = step.selectedTool?.requiresManual ?? false;

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
    if (!isManual) {
      setGenerating(true);
      setStreamKey((k) => k + 1);
    }
  }

  function handleParsed(raw: string) {
    try {
      const parsed = parseTitlesOutput(raw);
      if (parsed.length === 0) throw new Error("Got 0 titles — check the pasted text");
      setTitles(parsed);
      setParseError(null);
      setStepOutput("01-titles", { themes: selectedThemes, titles: parsed, selected: null });
    } catch (e) {
      setParseError(`Could not parse: ${e instanceof Error ? e.message : String(e)}`);
      setStepStatus("01-titles", "idle");
    }
  }

  function handleStreamComplete(raw: string) {
    setGenerating(false);
    handleParsed(raw);
  }

  function handleSelectTitle(t: TitleOption) {
    setSelectedTitle(t);
    setStepOutput("01-titles", { themes: selectedThemes, titles, selected: t });
  }

  function handleApprove() {
    if (!selectedTitle) return;
    approveStep("01-titles");
  }

  function handleRegenerate() {
    incrementRegenerate("01-titles");
    setStepStatus("01-titles", "idle");
    setTitles([]);
    setSelectedTitle(null);
    setPrompt("");
    setParseError(null);
    setGenerating(false);
  }

  return (
    <StepCard step={step} isActive>
      <ToolSelector
        tools={tools}
        selected={step.selectedTool}
        onSelect={(t) => { setStepTool("01-titles", t); setPrompt(""); setTitles([]); setSelectedTitle(null); }}
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

      {/* Generate / show prompt button */}
      {step.selectedTool && selectedThemes.length > 0 && !titlesReady && !generating && !prompt && (
        <button
          onClick={startGeneration}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
        >
          {isManual ? "Show ChatGPT Prompt →" : "Generate Title Ideas →"}
        </button>
      )}

      {/* MANUAL TOOL — show prompt + paste area */}
      {isManual && prompt && !titlesReady && (
        <ManualPastePanel
          toolName={step.selectedTool!.name}
          prompt={prompt}
          pasteLabel='Paste the JSON array ChatGPT returned (starts with "["):'
          placeholder={'[\n  {\n    "title": "...",\n    "emoji": "🎵",\n    "ageRange": "2-5 years",\n    "hook": "...",\n    "engagementScore": 8\n  },\n  ...\n]'}
          onSubmit={handleParsed}
          onRegen={() => { setPrompt(""); setParseError(null); }}
        />
      )}

      {/* API TOOL — stream directly */}
      {!isManual && generating && prompt && step.selectedTool?.apiSupported && (
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
          <p className="font-bold mb-1">⚠ Parse error</p>
          <p className="mb-2">{parseError}</p>
          <p className="text-xs text-slate-400 mb-2">
            Make sure you pasted the full JSON array including the outer <code className="bg-slate-800 px-1 rounded">[ ]</code> brackets.
          </p>
          <button onClick={handleRegenerate} className="px-4 py-1.5 bg-red-800 hover:bg-red-700 text-red-200 text-xs font-bold rounded-lg">
            ↺ Start Over
          </button>
        </div>
      )}

      {/* Review panel */}
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

      {titlesReady && !selectedTitle && (
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
