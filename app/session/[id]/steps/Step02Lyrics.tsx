"use client";

import { useState } from "react";
import { usePipelineStore } from "@/store/pipeline";
import { TOOLS_BY_STEP } from "@/lib/agent/tools";
import { buildLyricsPrompt, parseLyricsOutput, LyricsOutput, LyricsLength } from "@/lib/agent/steps/02-lyrics";
import { TitlesOutput } from "@/lib/agent/steps/01-titles";
import StepCard from "@/components/StepCard";
import ToolSelector from "@/components/ToolSelector";
import HumanReviewPanel from "@/components/HumanReviewPanel";
import StreamingOutput from "@/components/StreamingOutput";

const LENGTHS: { id: LyricsLength; label: string }[] = [
  { id: "short",  label: "Short (1.5 min)"  },
  { id: "medium", label: "Medium (2.5 min)" },
  { id: "long",   label: "Long (3.5 min)"   },
];

export default function Step02Lyrics() {
  const { steps, sessionId, setStepTool, setStepOutput, approveStep, setCurrentStep, incrementRegenerate } = usePipelineStore();
  const step = steps.find((s) => s.id === "02-lyrics")!;

  // Read title from store — persisted by Step01 on title selection
  const titlesStep = steps.find((s) => s.id === "01-titles");
  const titlesOutput = titlesStep?.output as TitlesOutput | null;
  const selectedTitle = titlesOutput?.selected;
  const themes = titlesOutput?.themes || [];

  // Restore lyrics from store if navigating back
  const storedLyrics = step.output as LyricsOutput | null;

  const [length, setLength] = useState<LyricsLength>("medium");
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState<LyricsOutput | null>(storedLyrics);
  const [generating, setGenerating] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);

  const tools = TOOLS_BY_STEP["02-lyrics"];
  const isApproved = step.status === "approved";

  function startGeneration() {
    if (!selectedTitle || generating) return;
    const p = buildLyricsPrompt(selectedTitle.title, themes, length);
    setPrompt(p);
    setLyrics(null);
    setParseError(null);
    setGenerating(true);
    setStreamKey((k) => k + 1);
  }

  function handleStreamComplete(raw: string) {
    setGenerating(false);
    if (!selectedTitle) return;
    try {
      const parsed = parseLyricsOutput(raw, selectedTitle.title, length);
      setLyrics(parsed);
      setStepOutput("02-lyrics", parsed);
    } catch (e) {
      setParseError(`Could not parse lyrics: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function handleRegenerate() {
    incrementRegenerate("02-lyrics");
    startGeneration();
  }

  // Title not yet selected/approved in Step 1
  if (!selectedTitle) {
    return (
      <StepCard step={step} isActive>
        <div className="p-5 bg-amber-900/20 border border-amber-700/40 rounded-xl text-center space-y-3">
          <p className="text-amber-300 font-bold">Step 1 not complete</p>
          <p className="text-slate-400 text-sm">Go back to Step 1, pick a title, and click <strong>Approve &amp; Continue</strong>.</p>
          <button
            onClick={() => setCurrentStep(0)}
            className="px-5 py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-all"
          >
            ← Back to Step 1
          </button>
        </div>
      </StepCard>
    );
  }

  return (
    <StepCard step={step} isActive>
      {/* Selected title banner */}
      <div className="flex items-center gap-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
        <span className="text-2xl">{selectedTitle.emoji}</span>
        <span className="font-bold text-white" style={{ fontFamily: "var(--font-fredoka)" }}>{selectedTitle.title}</span>
        <span className="ml-auto text-xs text-green-400 font-semibold">✓ Title locked</span>
      </div>

      <ToolSelector tools={tools} selected={step.selectedTool} onSelect={(t) => setStepTool("02-lyrics", t)} />

      {/* Length picker */}
      {!isApproved && (
        <div>
          <p className="text-xs text-slate-400 mb-2 font-semibold">Song length:</p>
          <div className="flex gap-2">
            {LENGTHS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLength(l.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all
                  ${length === l.id ? "bg-blue-600 border-blue-400 text-white" : "bg-slate-800 border-slate-600 text-slate-300 hover:border-blue-500/50"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generate button */}
      {step.selectedTool && !lyrics && !generating && !isApproved && (
        <button onClick={startGeneration} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all">
          Generate Lyrics →
        </button>
      )}

      {/* Streaming — hidden once lyrics are ready */}
      {generating && prompt && step.selectedTool?.apiSupported && (
        <StreamingOutput
          key={streamKey}
          sessionId={sessionId || ""}
          stepId="02-lyrics"
          prompt={prompt}
          onComplete={handleStreamComplete}
          autoStart
        />
      )}

      {parseError && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-xl text-sm text-red-300">
          <p className="font-bold mb-1">⚠ Generation error</p>
          <p>{parseError}</p>
          <button onClick={handleRegenerate} className="mt-2 px-4 py-1.5 bg-red-800 hover:bg-red-700 text-red-200 text-xs font-bold rounded-lg">
            ↺ Try Again
          </button>
        </div>
      )}

      {lyrics && (
        <HumanReviewPanel
          stepId="02-lyrics"
          output={lyrics}
          onAction={(action) => {
            if (action.type === "approve") approveStep("02-lyrics");
            else if (action.type === "regenerate") handleRegenerate();
            else if (action.type === "back") setCurrentStep(0);
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="px-2 py-1 bg-slate-800 rounded-full">{lyrics.readingLevel}</span>
              <span className="px-2 py-1 bg-slate-800 rounded-full">{lyrics.length}</span>
              <span className="px-2 py-1 bg-slate-800 rounded-full">{lyrics.sections.length} sections</span>
            </div>
            {lyrics.sections.map((section, i) => (
              <div key={i} className="bg-slate-900/60 rounded-xl p-4 border border-slate-700">
                <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-2">[{section.label}]</h4>
                {section.lines.map((line, j) => (
                  <p key={j} className="text-slate-200 text-sm leading-relaxed">{line}</p>
                ))}
              </div>
            ))}
          </div>
        </HumanReviewPanel>
      )}
    </StepCard>
  );
}
