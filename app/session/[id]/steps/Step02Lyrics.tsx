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
  const { steps, sessionId, setStepTool, setStepOutput, approveStep, setCurrentStep, setStreamingText, incrementRegenerate } = usePipelineStore();
  const step = steps.find((s) => s.id === "02-lyrics")!;
  const titlesStep = steps.find((s) => s.id === "01-titles");
  const titlesOutput = titlesStep?.output as TitlesOutput | null;
  const selectedTitle = titlesOutput?.selected;
  const themes = titlesOutput?.themes || [];

  const [length, setLength] = useState<LyricsLength>("medium");
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState<LyricsOutput | null>(null);

  const tools = TOOLS_BY_STEP["02-lyrics"];

  function buildPrompt() {
    if (!selectedTitle) return;
    const p = buildLyricsPrompt(selectedTitle.title, themes, length);
    setPrompt(p);
    setStreamingText("");
    setLyrics(null);
  }

  function handleStreamComplete(raw: string) {
    if (!selectedTitle) return;
    const parsed = parseLyricsOutput(raw, selectedTitle.title, length);
    setLyrics(parsed);
    setStepOutput("02-lyrics", parsed);
  }

  return (
    <StepCard step={step} isActive>
      {!selectedTitle && (
        <div className="p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl text-amber-300 text-sm">
          ← Complete Step 1 first to select a title
        </div>
      )}

      {selectedTitle && (
        <>
          {/* Selected title banner */}
          <div className="flex items-center gap-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
            <span className="text-2xl">{selectedTitle.emoji}</span>
            <span className="font-bold text-white" style={{ fontFamily: "var(--font-fredoka)" }}>{selectedTitle.title}</span>
          </div>

          <ToolSelector tools={tools} selected={step.selectedTool} onSelect={(t) => setStepTool("02-lyrics", t)} />

          {/* Length picker */}
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

          {step.selectedTool && !prompt && (
            <button onClick={buildPrompt} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all">
              Generate Lyrics →
            </button>
          )}

          {prompt && step.selectedTool?.apiSupported && (
            <StreamingOutput sessionId={sessionId || ""} stepId="02-lyrics" prompt={prompt} onComplete={handleStreamComplete} autoStart />
          )}

          {lyrics && (
            <HumanReviewPanel
              stepId="02-lyrics"
              output={lyrics}
              onAction={(action) => {
                if (action.type === "approve") approveStep("02-lyrics");
                else if (action.type === "regenerate") { incrementRegenerate("02-lyrics"); buildPrompt(); }
                else if (action.type === "back") setCurrentStep(0);
              }}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="px-2 py-1 bg-slate-800 rounded-full">{lyrics.readingLevel}</span>
                  <span className="px-2 py-1 bg-slate-800 rounded-full">{length}</span>
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
        </>
      )}
    </StepCard>
  );
}
