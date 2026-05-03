"use client";

import { useState } from "react";
import { usePipelineStore } from "@/store/pipeline";
import { TOOLS_BY_STEP } from "@/lib/agent/tools";
import {
  AssemblyConfig, AssemblyOutput, DEFAULT_ASSEMBLY_CONFIG,
  TransitionType, CaptionStyle, ColorGrade, ExportResolution,
  buildFFmpegCommand
} from "@/lib/agent/steps/08-video-assembly";
import StepCard from "@/components/StepCard";
import ToolSelector from "@/components/ToolSelector";
import HumanReviewPanel from "@/components/HumanReviewPanel";

const TRANSITIONS: TransitionType[] = ["cut","fade","slide","zoom","wipe"];
const CAPTION_STYLES: CaptionStyle[] = ["bubbly","bold","simple","animated"];
const COLOR_GRADES: ColorGrade[] = ["vivid","warm","cool","natural","dreamy"];
const RESOLUTIONS: ExportResolution[] = ["720p","1080p","4k"];

export default function Step08Assembly() {
  const { steps, setStepTool, setStepOutput, approveStep, setCurrentStep } = usePipelineStore();
  const step = steps.find((s) => s.id === "08-assembly")!;

  const [config, setConfig] = useState<AssemblyConfig>(DEFAULT_ASSEMBLY_CONFIG);
  const [output, setOutput] = useState<AssemblyOutput | null>(null);
  const [assembling, setAssembling] = useState(false);

  const tools = TOOLS_BY_STEP["08-assembly"];

  function update<K extends keyof AssemblyConfig>(key: K, value: AssemblyConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function runAssembly() {
    setAssembling(true);
    // For now show the FFmpeg command that would be run
    const cmd = buildFFmpegCommand(["clip1.mp4","clip2.mp4"], "music.mp3", "output.mp4", config.resolution, config.transition);
    const result: AssemblyOutput = {
      config,
      durationSeconds: 120,
      status: "complete",
      ffmpegCommand: cmd,
    };
    setOutput(result);
    setStepOutput("08-assembly", result);
    setAssembling(false);
  }

  return (
    <StepCard step={step} isActive>
      <ToolSelector tools={tools} selected={step.selectedTool} onSelect={(t) => setStepTool("08-assembly", t)} />

      {/* Config controls */}
      <div className="grid grid-cols-1 gap-4">
        <ConfigRow label="Transition" options={TRANSITIONS} value={config.transition} onChange={(v) => update("transition", v as TransitionType)} />
        <ConfigRow label="Captions"   options={CAPTION_STYLES} value={config.captionStyle} onChange={(v) => update("captionStyle", v as CaptionStyle)} />
        <ConfigRow label="Color grade" options={COLOR_GRADES} value={config.colorGrade} onChange={(v) => update("colorGrade", v as ColorGrade)} />
        <ConfigRow label="Resolution" options={RESOLUTIONS} value={config.resolution} onChange={(v) => update("resolution", v as ExportResolution)} />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
        <input type="checkbox" checked={config.addSoundEffects} onChange={(e) => update("addSoundEffects", e.target.checked)} className="accent-blue-500" />
        Extract ambient sound effects from clips
      </label>

      {step.selectedTool && !output && (
        <button onClick={runAssembly} disabled={assembling} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold rounded-xl transition-all">
          {assembling ? "Assembling Video…" : "Assemble Video →"}
        </button>
      )}

      {output && (
        <>
          {output.ffmpegCommand && (
            <div className="p-3 bg-slate-900/70 border border-slate-700 rounded-xl">
              <p className="text-xs text-slate-400 mb-1 font-semibold">FFmpeg command:</p>
              <pre className="text-xs font-mono text-green-300 overflow-auto whitespace-pre-wrap">{output.ffmpegCommand}</pre>
            </div>
          )}
          <HumanReviewPanel stepId="08-assembly" output={output}
            onAction={(action) => {
              if (action.type === "approve") approveStep("08-assembly");
              else if (action.type === "back") setCurrentStep(6);
            }}
          >
            <div className="flex flex-wrap gap-2 text-xs">
              <Chip label={`Transition: ${output.config.transition}`} />
              <Chip label={`Captions: ${output.config.captionStyle}`} />
              <Chip label={`Grade: ${output.config.colorGrade}`} />
              <Chip label={output.config.resolution} />
              <Chip label={`~${output.durationSeconds}s`} />
            </div>
          </HumanReviewPanel>
        </>
      )}
    </StepCard>
  );
}

function ConfigRow({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1.5 font-semibold">{label}:</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border capitalize transition-all
              ${value === o ? "bg-blue-700 border-blue-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-300">{label}</span>;
}
