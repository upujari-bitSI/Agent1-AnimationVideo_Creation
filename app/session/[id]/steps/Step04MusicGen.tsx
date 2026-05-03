"use client";

import { useState } from "react";
import { usePipelineStore } from "@/store/pipeline";
import { TOOLS_BY_STEP } from "@/lib/agent/tools";
import { MusicTrack, buildManualInstructions } from "@/lib/agent/steps/04-music-gen";
import { LyricsOutput } from "@/lib/agent/steps/02-lyrics";
import { MusicStyleOutput } from "@/lib/agent/steps/03-music-style";
import StepCard from "@/components/StepCard";
import ToolSelector from "@/components/ToolSelector";
import HumanReviewPanel from "@/components/HumanReviewPanel";

export default function Step04MusicGen() {
  const { steps, setStepTool, setStepOutput, approveStep, setCurrentStep } = usePipelineStore();
  const step = steps.find((s) => s.id === "04-music-gen")!;
  const lyricsOutput = steps.find((s) => s.id === "02-lyrics")?.output as LyricsOutput | null;
  const styleOutput = steps.find((s) => s.id === "03-music-style")?.output as MusicStyleOutput | null;

  const stored = step.output as { tracks?: MusicTrack[]; selected?: MusicTrack } | null;
  const [tracks, setTracks] = useState<MusicTrack[]>(stored?.tracks ?? []);
  const [selected, setSelected] = useState<MusicTrack | null>(stored?.selected ?? null);
  const [manualInstructions, setManualInstructions] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [uploadedName, setUploadedName] = useState<string>("");

  const tools = TOOLS_BY_STEP["04-music-gen"];

  function handleLocalUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const t: MusicTrack = { id: `local-${Date.now()}`, url, title: file.name.replace(/\.[^.]+$/, "") };
    setTracks((prev) => [...prev.filter((x) => !x.id.startsWith("local-")), t]);
    setSelected(t);
    setUploadedName(file.name);
    setStepOutput("04-music-gen", { tracks: [t], selected: t });
  }

  async function handleGenerate() {
    if (!step.selectedTool) return;
    if (step.selectedTool.requiresManual) {
      const instructions = buildManualInstructions(
        step.selectedTool,
        lyricsOutput?.rawText || "",
        styleOutput?.sunoStyleTag || ""
      );
      setManualInstructions(instructions);
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: step.selectedTool.id,
          action: "generate",
          payload: { lyrics: lyricsOutput?.rawText, styleTag: styleOutput?.sunoStyleTag },
        }),
      });
      const data = await res.json();
      if (data.tracks) setTracks(data.tracks);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <StepCard step={step} isActive>
      <ToolSelector tools={tools} selected={step.selectedTool} onSelect={(t) => setStepTool("04-music-gen", t)} />

      {/* Monetization warning */}
      {step.selectedTool && !step.selectedTool.commercialOk && (
        <div className="p-3 bg-red-900/40 border border-red-700/60 rounded-xl text-sm text-red-300 font-semibold">
          ⚠️ Free tier — this music CANNOT be monetized on YouTube. Switch to a paid plan for monetization.
        </div>
      )}

      {/* Style summary */}
      {styleOutput && (
        <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 text-sm text-slate-300">
          <span className="text-slate-400 font-semibold mr-2">Style:</span>
          <span className="font-mono text-green-300">{styleOutput.sunoStyleTag}</span>
        </div>
      )}

      {step.selectedTool && !manualInstructions && tracks.length === 0 && (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold rounded-xl transition-all"
        >
          {generating ? "Generating Music…" : "Generate Music →"}
        </button>
      )}

      {/* Local file upload — always available regardless of selected tool */}
      <div className="p-4 bg-slate-800/40 border border-dashed border-slate-600 rounded-xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">📁</span>
          <p className="text-sm font-semibold text-slate-300">Or upload a local audio file</p>
          <span className="ml-auto text-xs text-slate-500">.mp3 .wav .m4a</span>
        </div>
        <label className="block">
          <input
            type="file"
            accept="audio/*"
            onChange={handleLocalUpload}
            className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-700 file:text-white file:font-bold file:cursor-pointer hover:file:bg-blue-600"
          />
        </label>
        {uploadedName && <p className="text-xs text-green-400">&#x2713; Uploaded: {uploadedName}</p>}
        {selected && selected.id.startsWith("local-") && (
          <audio controls src={selected.url} className="w-full mt-2 h-10" />
        )}
      </div>

      {/* Manual instructions */}
      {manualInstructions && (
        <div className="p-4 bg-slate-800/60 border border-slate-600 rounded-xl space-y-3">
          <pre className="whitespace-pre-wrap text-sm text-slate-200 leading-relaxed">{manualInstructions}</pre>
          <div>
            <p className="text-xs text-slate-400 mb-1 font-semibold">Paste your generated track URL here:</p>
            <input
              type="text"
              placeholder="https://..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              onChange={(e) => {
                if (e.target.value) {
                  const t: MusicTrack = { id: "manual-1", url: e.target.value, title: "My Track" };
                  setTracks([t]);
                  setSelected(t);
                  setStepOutput("04-music-gen", { tracks: [t], selected: t });
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Track list */}
      {tracks.length > 0 && (
        <div className="space-y-2">
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => { setSelected(track); setStepOutput("04-music-gen", { tracks, selected: track }); }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left
                ${selected?.id === track.id ? "border-blue-500 bg-blue-900/20" : "border-slate-700 bg-slate-800/50 hover:border-slate-600"}`}
            >
              <span className="text-2xl">🎵</span>
              <div className="flex-1">
                <div className="font-bold text-slate-200">{track.title}</div>
                {track.url && <div className="text-xs text-slate-500 truncate">{track.url}</div>}
              </div>
              {selected?.id === track.id && <span className="text-blue-400 font-bold text-sm">✓ Selected</span>}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <HumanReviewPanel
          stepId="04-music-gen"
          output={selected}
          onAction={(action) => {
            if (action.type === "approve") approveStep("04-music-gen");
            else if (action.type === "back") setCurrentStep(2);
          }}
        >
          <p className="text-sm text-slate-300">Selected: <span className="font-bold text-white">{selected.title}</span></p>
        </HumanReviewPanel>
      )}
    </StepCard>
  );
}
