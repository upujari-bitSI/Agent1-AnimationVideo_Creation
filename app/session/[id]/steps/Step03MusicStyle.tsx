"use client";

import { useState } from "react";
import { usePipelineStore } from "@/store/pipeline";
import { TOOLS_BY_STEP } from "@/lib/agent/tools";
import {
  buildMusicStylePrompt, parseMusicStyleOutput, MusicStyleOutput,
  StylePreset, TempoPreference, EnergyLevel, VocalType, STYLE_PRESETS
} from "@/lib/agent/steps/03-music-style";
import { TitlesOutput } from "@/lib/agent/steps/01-titles";
import StepCard from "@/components/StepCard";
import ToolSelector from "@/components/ToolSelector";
import HumanReviewPanel from "@/components/HumanReviewPanel";
import StreamingOutput from "@/components/StreamingOutput";
import ManualPastePanel from "@/components/ManualPastePanel";

const VOCALS: { id: VocalType; label: string }[] = [
  { id: "child", label: "Child Voice" },
  { id: "female-adult", label: "Female Adult" },
  { id: "male-adult", label: "Male Adult" },
  { id: "animated", label: "Animated Character" },
];

export default function Step03MusicStyle() {
  const { steps, sessionId, setStepTool, setStepOutput, approveStep, setCurrentStep, incrementRegenerate } = usePipelineStore();
  const step = steps.find((s) => s.id === "03-music-style")!;
  const titlesOutput = (steps.find((s) => s.id === "01-titles")?.output as TitlesOutput | null);
  const selectedTitle = titlesOutput?.selected;

  const storedStyle = step.output as MusicStyleOutput | null;

  const [preset, setPreset] = useState<StylePreset>(storedStyle?.preset ?? "bouncy-pop");
  const [tempo, setTempo] = useState<TempoPreference>("medium");
  const [energy, setEnergy] = useState<EnergyLevel>("moderate");
  const [vocal, setVocal] = useState<VocalType>("child");
  const [prompt, setPrompt] = useState("");
  const [styleOutput, setStyleOutput] = useState<MusicStyleOutput | null>(storedStyle);
  const [generating, setGenerating] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);

  const tools = TOOLS_BY_STEP["03-music-style"];
  const isManual = step.selectedTool?.requiresManual ?? false;

  function startGeneration() {
    if (!selectedTitle || generating) return;
    const p = buildMusicStylePrompt(selectedTitle.title, preset, tempo, energy, vocal);
    setPrompt(p);
    setStyleOutput(null);
    setParseError(null);
    if (!isManual) {
      setGenerating(true);
      setStreamKey((k) => k + 1);
    }
  }

  function handleParsed(raw: string) {
    try {
      const parsed = parseMusicStyleOutput(raw);
      const output = { ...parsed, preset };
      setStyleOutput(output);
      setStepOutput("03-music-style", output);
      setParseError(null);
    } catch (e) {
      setParseError(`Could not parse: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function handleStreamComplete(raw: string) {
    setGenerating(false);
    handleParsed(raw);
  }

  function handleRegenerate() {
    incrementRegenerate("03-music-style");
    setPrompt("");
    setStyleOutput(null);
    setParseError(null);
    setGenerating(false);
  }

  return (
    <StepCard step={step} isActive>
      <ToolSelector tools={tools} selected={step.selectedTool} onSelect={(t) => { setStepTool("03-music-style", t); setPrompt(""); setStyleOutput(null); }} />

      {/* Style presets */}
      <div>
        <p className="text-xs text-slate-400 mb-2 font-semibold">Style preset:</p>
        <div className="flex flex-wrap gap-2">
          {STYLE_PRESETS.map((s) => (
            <button key={s.id} onClick={() => setPreset(s.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all
                ${preset === s.id ? "bg-purple-700 border-purple-400 text-white" : "bg-slate-800 border-slate-600 text-slate-300 hover:border-purple-500/50"}`}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tempo + Energy sliders */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-400 mb-2 font-semibold">Tempo: <span className="text-slate-200">{tempo}</span></p>
          <div className="flex gap-1">
            {(["slow","medium","fast"] as TempoPreference[]).map((t) => (
              <button key={t} onClick={() => setTempo(t)}
                className={`flex-1 py-1 rounded text-xs font-bold border transition-all
                  ${tempo === t ? "bg-blue-600 border-blue-400 text-white" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-2 font-semibold">Energy: <span className="text-slate-200">{energy}</span></p>
          <div className="flex gap-1">
            {(["calm","moderate","energetic"] as EnergyLevel[]).map((e) => (
              <button key={e} onClick={() => setEnergy(e)}
                className={`flex-1 py-1 rounded text-xs font-bold border transition-all
                  ${energy === e ? "bg-purple-600 border-purple-400 text-white" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vocal type */}
      <div>
        <p className="text-xs text-slate-400 mb-2 font-semibold">Vocal type:</p>
        <div className="flex flex-wrap gap-2">
          {VOCALS.map((v) => (
            <button key={v.id} onClick={() => setVocal(v.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all
                ${vocal === v.id ? "bg-green-700 border-green-400 text-white" : "bg-slate-800 border-slate-600 text-slate-300"}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {step.selectedTool && !styleOutput && !generating && !prompt && (
        <button onClick={startGeneration} disabled={!selectedTitle}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all">
          {isManual ? "Show ChatGPT Prompt →" : "Generate Music Style Brief →"}
        </button>
      )}

      {/* MANUAL — paste-back panel */}
      {isManual && prompt && !styleOutput && (
        <ManualPastePanel
          toolName={step.selectedTool!.name}
          prompt={prompt}
          pasteLabel="Paste the JSON object ChatGPT returned (starts with { ):"
          placeholder={'{\n  "styleDescription": "...",\n  "tempo": "...",\n  ...\n}'}
          onSubmit={handleParsed}
          onRegen={() => { setPrompt(""); setParseError(null); }}
        />
      )}

      {/* API — streaming */}
      {!isManual && generating && prompt && step.selectedTool?.apiSupported && (
        <StreamingOutput key={streamKey} sessionId={sessionId || ""} stepId="03-music-style" prompt={prompt} onComplete={handleStreamComplete} autoStart />
      )}

      {parseError && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-xl text-sm text-red-300">
          <p className="font-bold mb-1">&#x26A0; Parse error</p>
          <p className="mb-1">{parseError}</p>
          <button onClick={handleRegenerate} className="mt-1 px-4 py-1.5 bg-red-800 hover:bg-red-700 text-red-200 text-xs font-bold rounded-lg">
            &#x21BA; Try Again
          </button>
        </div>
      )}

      {styleOutput && (
        <HumanReviewPanel stepId="03-music-style" output={styleOutput}
          onAction={(action) => {
            if (action.type === "approve") approveStep("03-music-style");
            else if (action.type === "regenerate") handleRegenerate();
            else if (action.type === "back") setCurrentStep(1);
          }}
        >
          <div className="grid grid-cols-1 gap-3 text-sm">
            <InfoRow label="Style" value={styleOutput.styleDescription} />
            <InfoRow label="Tempo" value={styleOutput.tempo} />
            <InfoRow label="Mood" value={styleOutput.mood} />
            <InfoRow label="Instruments" value={styleOutput.instruments.join(", ")} />
            <InfoRow label="Vocal" value={styleOutput.vocalStyle} />
            <InfoRow label="Suno Tag" value={styleOutput.sunoStyleTag} mono />
            <InfoRow label="Avoid" value={styleOutput.avoidances.join(", ")} warn />
          </div>
        </HumanReviewPanel>
      )}
    </StepCard>
  );
}

function InfoRow({ label, value, mono, warn }: { label: string; value: string; mono?: boolean; warn?: boolean }) {
  return (
    <div className="flex gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
      <span className="text-xs font-bold text-slate-400 w-20 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-xs leading-relaxed ${mono ? "font-mono text-green-300" : warn ? "text-amber-300" : "text-slate-200"}`}>{value}</span>
    </div>
  );
}
