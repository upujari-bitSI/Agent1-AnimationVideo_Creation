"use client";

import { useState } from "react";
import { usePipelineStore } from "@/store/pipeline";
import { TOOLS_BY_STEP } from "@/lib/agent/tools";
import { buildYouTubeMetaPrompt, parseYouTubeMetaOutput, buildLyricsSummary, YouTubeMetadata } from "@/lib/agent/steps/09-youtube-meta";
import { TitlesOutput } from "@/lib/agent/steps/01-titles";
import { LyricsOutput } from "@/lib/agent/steps/02-lyrics";
import StepCard from "@/components/StepCard";
import ToolSelector from "@/components/ToolSelector";
import HumanReviewPanel from "@/components/HumanReviewPanel";
import StreamingOutput from "@/components/StreamingOutput";

export default function Step09YouTube() {
  const { steps, sessionId, setStepTool, setStepOutput, approveStep, setCurrentStep, incrementRegenerate } = usePipelineStore();
  const step = steps.find((s) => s.id === "09-youtube")!;
  const titlesOutput = steps.find((s) => s.id === "01-titles")?.output as TitlesOutput | null;
  const lyricsOutput = steps.find((s) => s.id === "02-lyrics")?.output as LyricsOutput | null;

  const [prompt, setPrompt] = useState("");
  const [meta, setMeta] = useState<YouTubeMetadata | null>((step.output as YouTubeMetadata | null));
  const [selectedTitleIdx, setSelectedTitleIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [streamKey, setStreamKey] = useState(0);

  const tools = TOOLS_BY_STEP["09-youtube"];
  const title = titlesOutput?.selected?.title || "";
  const themes = titlesOutput?.themes || [];

  function buildPrompt() {
    if (generating) return;
    const lyricsSummary = lyricsOutput ? buildLyricsSummary(lyricsOutput.rawText) : "";
    const p = buildYouTubeMetaPrompt(title, lyricsSummary, themes);
    setPrompt(p);
    setMeta(null);
    setGenerating(true);
    setStreamKey((k) => k + 1);
  }

  function handleStreamComplete(raw: string) {
    setGenerating(false);
    try {
      const parsed = parseYouTubeMetaOutput(raw);
      setMeta(parsed);
      setStepOutput("09-youtube", parsed);
    } catch {}
  }

  return (
    <StepCard step={step} isActive>
      <ToolSelector tools={tools} selected={step.selectedTool} onSelect={(t) => setStepTool("09-youtube", t)} />

      {step.selectedTool && !meta && !generating && (
        <button onClick={buildPrompt} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all">
          Generate YouTube Metadata →
        </button>
      )}

      {generating && prompt && step.selectedTool?.apiSupported && (
        <StreamingOutput key={streamKey} sessionId={sessionId || ""} stepId="09-youtube" prompt={prompt} onComplete={handleStreamComplete} autoStart />
      )}

      {meta && (
        <HumanReviewPanel stepId="09-youtube" output={meta}
          onAction={(action) => {
            if (action.type === "approve") approveStep("09-youtube");
            else if (action.type === "regenerate") { incrementRegenerate("09-youtube"); buildPrompt(); }
            else if (action.type === "back") setCurrentStep(7);
          }}
        >
          <div className="space-y-4">
            {/* Title options */}
            <div>
              <p className="text-xs text-slate-400 font-semibold mb-2">Title options (pick one):</p>
              <div className="space-y-1.5">
                {meta.titleOptions.map((t, i) => (
                  <button key={i} onClick={() => { setSelectedTitleIdx(i); setMeta({ ...meta, selectedTitle: t }); setStepOutput("09-youtube", { ...meta, selectedTitle: t }); }}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all
                      ${selectedTitleIdx === i ? "border-blue-500 bg-blue-900/20 text-white font-semibold" : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs text-slate-400 font-semibold mb-1">Description:</p>
              <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {meta.description}
              </div>
            </div>

            {/* Tags */}
            <div>
              <p className="text-xs text-slate-400 font-semibold mb-2">Tags ({meta.tags.length}):</p>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {meta.tags.map(({ tag, relevance }) => (
                  <span key={tag} className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-300"
                    title={`Relevance: ${relevance}/10`}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Thumbnail text */}
            <div className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-700/30 rounded-xl">
              <span className="text-2xl">▶️</span>
              <div>
                <p className="text-xs text-slate-400 font-semibold">Thumbnail text overlay:</p>
                <p className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-fredoka)" }}>{meta.thumbnailText}</p>
              </div>
            </div>

            {/* Copy button */}
            <button
              onClick={() => {
                const text = `TITLE: ${meta.selectedTitle || meta.titleOptions[0]}\n\nDESCRIPTION:\n${meta.description}\n\nTAGS:\n${meta.tags.map((t) => t.tag).join(", ")}`;
                navigator.clipboard.writeText(text);
              }}
              className="w-full py-2 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 rounded-xl text-sm font-semibold transition-all"
            >
              📋 Copy All to Clipboard
            </button>
          </div>
        </HumanReviewPanel>
      )}
    </StepCard>
  );
}
