"use client";

import { useState } from "react";
import { usePipelineStore } from "@/store/pipeline";
import { TOOLS_BY_STEP } from "@/lib/agent/tools";
import { AnimatedClip, MotionIntensity, buildAnimationPrompt } from "@/lib/agent/steps/07-animation";
import { ScenesOutput } from "@/lib/agent/steps/06-scenes";
import StepCard from "@/components/StepCard";
import ToolSelector from "@/components/ToolSelector";
import HumanReviewPanel from "@/components/HumanReviewPanel";

export default function Step07Animation() {
  const { steps, setStepTool, setStepOutput, approveStep, setCurrentStep } = usePipelineStore();
  const step = steps.find((s) => s.id === "07-animation")!;
  const scenesOutput = steps.find((s) => s.id === "06-scenes")?.output as ScenesOutput | null;

  const stored = step.output as { clips?: AnimatedClip[]; continuousFlow?: boolean } | null;
  const [clips, setClips] = useState<AnimatedClip[]>(stored?.clips ?? []);
  const [continuousFlow, setContinuousFlow] = useState(stored?.continuousFlow ?? true);
  const [generating, setGenerating] = useState(false);
  const [generatingIdx, setGeneratingIdx] = useState(-1);
  const [manualPrompts, setManualPrompts] = useState<Record<number, string>>({});

  const tools = TOOLS_BY_STEP["07-animation"];
  const isManual = step.selectedTool?.requiresManual ?? false;
  const approvedClips = clips.filter((c) => c.approved);
  const totalDuration = approvedClips.reduce((s, c) => s + c.duration, 0);

  function handleClipUpload(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setClips((prev) => prev.map((c, i) => i === idx ? { ...c, videoUrl: url } : c));
  }

  function copyManualPrompt(idx: number) {
    const clip = clips[idx];
    if (!clip) return;
    const prompt = buildAnimationPrompt(clip.imageUrl, clip.motionIntensity);
    navigator.clipboard.writeText(prompt);
    setManualPrompts((prev) => ({ ...prev, [idx]: prompt }));
    setTimeout(() => setManualPrompts((prev) => { const n = { ...prev }; delete n[idx]; return n; }), 2000);
  }

  function initClips() {
    if (!scenesOutput?.scenes) return;
    const initial: AnimatedClip[] = scenesOutput.scenes
      .filter((s) => s.approved && s.imageUrl)
      .map((s, i) => ({
        id: `clip-${i}`,
        sceneId: s.id,
        imageUrl: s.imageUrl || "",
        duration: 4,
        motionIntensity: "moderate" as MotionIntensity,
        approved: false,
        trimIn: 0,
        trimOut: 4,
      }));
    setClips(initial);
  }

  async function animateClip(idx: number) {
    if (!step.selectedTool) return;
    const clip = clips[idx];
    const prompt = buildAnimationPrompt(clip.imageUrl, clip.motionIntensity);

    if (step.selectedTool.requiresManual) {
      // Manual tool — show prompt and wait for upload
      setClips((prev) => prev.map((c, i) => i === idx ? { ...c, videoUrl: "manual-pending" } : c));
      copyManualPrompt(idx);
      return;
    }

    setGeneratingIdx(idx);
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: step.selectedTool.id, action: "animate", payload: { imageUrl: clip.imageUrl, prompt } }),
      });
      const data = await res.json();
      setClips((prev) => prev.map((c, i) => i === idx ? { ...c, videoUrl: data.videoUrl || "" } : c));
    } catch {} finally {
      setGeneratingIdx(-1);
    }
  }

  async function animateAll() {
    setGenerating(true);
    for (let i = 0; i < clips.length; i++) await animateClip(i);
    setGenerating(false);
  }

  return (
    <StepCard step={step} isActive>
      <ToolSelector tools={tools} selected={step.selectedTool} onSelect={(t) => setStepTool("07-animation", t)} />

      {step.selectedTool && !step.selectedTool.commercialOk && (
        <div className="p-3 bg-red-900/40 border border-red-700/60 rounded-xl text-sm text-red-300 font-semibold">
          ⚠️ Free tier animations cannot be monetized on YouTube.
        </div>
      )}

      {/* Continuous flow toggle */}
      {clips.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={continuousFlow} onChange={(e) => setContinuousFlow(e.target.checked)} className="accent-blue-500" />
          Continuous flow (last frame of clip N → first frame of clip N+1)
        </label>
      )}

      {!scenesOutput && (
        <div className="p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl text-sm space-y-1">
          <p className="text-amber-300 font-semibold">No approved scenes yet</p>
          <p className="text-slate-400">Complete and approve Step 6 (Scene Images) first, then load them here to animate.</p>
        </div>
      )}

      {scenesOutput && clips.length === 0 && step.selectedTool && (
        <button onClick={initClips} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all">
          Load Approved Scenes →
        </button>
      )}

      {clips.length > 0 && (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{approvedClips.length}/{clips.length} clips · {totalDuration}s total</span>
            <button onClick={animateAll} disabled={generating}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-all">
              {generating ? "Animating…" : "Animate All"}
            </button>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {clips.map((clip, i) => {
              const isClipGen = generatingIdx === i || (generating && !clip.videoUrl);
              const hasVideo = clip.videoUrl && clip.videoUrl !== "manual-pending";
              const needsManualUpload = clip.videoUrl === "manual-pending" || (isManual && !hasVideo);
              return (
                <div key={clip.id} className={`p-3 rounded-xl border transition-all
                  ${clip.approved ? "border-green-700/40 bg-green-900/10" : "border-slate-700/50 bg-slate-800/40"}`}>
                  <div className="flex gap-3">
                    {/* Image / video preview */}
                    <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-700 relative">
                      {hasVideo ? (
                        <video src={clip.videoUrl} controls className="w-full h-full object-cover" />
                      ) : clip.imageUrl ? (
                        <img src={clip.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-2xl">🖼</div>
                      )}
                      {isClipGen && (
                        <div className="absolute inset-0 bg-blue-900/60 flex items-center justify-center">
                          <span className="pulse-dot text-2xl">⚡</span>
                        </div>
                      )}
                    </div>

                    {/* Info & motion intensity */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs text-slate-400 font-semibold">Clip {i+1} · {clip.duration}s</p>
                      <div className="flex gap-1">
                        {(["subtle","moderate","dynamic"] as MotionIntensity[]).map((m) => (
                          <button key={m} onClick={() => setClips((prev) => prev.map((c, j) => j === i ? { ...c, motionIntensity: m } : c))}
                            className={`px-2 py-0.5 text-xs rounded border transition-all
                              ${clip.motionIntensity === m ? "bg-purple-700 border-purple-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                            {m}
                          </button>
                        ))}
                      </div>
                      {isClipGen && (
                        <div className="space-y-1 pt-1">
                          <p className="text-xs text-blue-300 font-semibold">Generating animation… (this can take 1–3 min)</p>
                          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full animate-pulse" style={{ width: "60%" }} />
                          </div>
                        </div>
                      )}
                      {hasVideo && <p className="text-xs text-green-400">&#x2713; Video ready</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => animateClip(i)} disabled={isClipGen}
                        className="px-2 py-1 text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg">
                        {isClipGen ? "…" : "Anim"}
                      </button>
                      <button onClick={() => {
                        const updated = clips.map((c, j) => j === i ? { ...c, approved: !c.approved } : c);
                        setClips(updated);
                        setStepOutput("07-animation", { clips: updated, totalDuration: updated.filter((x) => x.approved).reduce((s, c) => s + c.duration, 0), continuousFlow });
                      }}
                        className={`px-2 py-1 text-xs rounded-lg transition-all ${clip.approved ? "bg-green-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
                        {clip.approved ? "✓" : "OK"}
                      </button>
                    </div>
                  </div>

                  {/* Manual upload section (always shown for manual tools, or when generation is "pending") */}
                  {(needsManualUpload || !hasVideo) && (
                    <div className="mt-3 pt-3 border-t border-slate-700/40 space-y-2">
                      {isManual && (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-amber-300">
                            {clip.videoUrl === "manual-pending" ? `Generate this clip in ${step.selectedTool!.name} (prompt copied)` : `Use ${step.selectedTool!.name} to animate, then upload below`}
                          </p>
                          <button
                            onClick={() => copyManualPrompt(i)}
                            className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex-shrink-0"
                          >
                            {manualPrompts[i] ? "&#x2713; Copied" : "Copy prompt"}
                          </button>
                        </div>
                      )}
                      <label className="block">
                        <span className="text-xs text-slate-400 font-semibold">Upload local video for this clip:</span>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => handleClipUpload(i, e)}
                          className="block w-full mt-1 text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-700 file:text-white file:text-xs file:font-bold file:cursor-pointer hover:file:bg-blue-600"
                        />
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {approvedClips.length === clips.length && clips.length > 0 && (
        <HumanReviewPanel stepId="07-animation" output={{ clips, totalDuration, continuousFlow }}
          onAction={(action) => {
            if (action.type === "approve") { setStepOutput("07-animation", { clips, totalDuration, continuousFlow }); approveStep("07-animation"); }
            else if (action.type === "back") setCurrentStep(5);
          }}
        >
          <p className="text-sm text-green-300 font-semibold">✓ All {clips.length} clips approved · {totalDuration}s</p>
        </HumanReviewPanel>
      )}
    </StepCard>
  );
}
