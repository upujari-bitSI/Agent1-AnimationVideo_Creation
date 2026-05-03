"use client";

import { useState } from "react";
import { usePipelineStore } from "@/store/pipeline";
import { TOOLS_BY_STEP } from "@/lib/agent/tools";
import { SceneImage, extractLyricLines } from "@/lib/agent/steps/06-scenes";
import { LyricsOutput } from "@/lib/agent/steps/02-lyrics";
import { CharacterOutput } from "@/lib/agent/steps/05-character";
import StepCard from "@/components/StepCard";
import ToolSelector from "@/components/ToolSelector";
import HumanReviewPanel from "@/components/HumanReviewPanel";

export default function Step06Scenes() {
  const { steps, setStepTool, setStepOutput, approveStep, setCurrentStep } = usePipelineStore();
  const step = steps.find((s) => s.id === "06-scenes")!;
  const lyricsOutput = steps.find((s) => s.id === "02-lyrics")?.output as LyricsOutput | null;
  const characterOutput = steps.find((s) => s.id === "05-character")?.output as CharacterOutput | null;

  const [scenes, setScenes] = useState<SceneImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatingIdx, setGeneratingIdx] = useState(-1);

  const tools = TOOLS_BY_STEP["06-scenes"];
  const lyricLines = lyricsOutput ? extractLyricLines(lyricsOutput.sections) : [];
  const approvedCount = scenes.filter((s) => s.approved).length;

  function initScenes() {
    const initial: SceneImage[] = lyricLines.map((ll, i) => ({
      id: `scene-${i}`,
      lyricLine: ll.line,
      sectionLabel: ll.section,
      prompt: "",
      approved: false,
      regenerateCount: 0,
    }));
    setScenes(initial);
  }

  async function generateScene(idx: number) {
    if (!step.selectedTool) return;
    setGeneratingIdx(idx);
    const scene = scenes[idx];
    const prevLine = idx > 0 ? scenes[idx - 1].lyricLine : "";

    // Build prompt via Claude API first
    try {
      const streamRes = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Generate a DALL-E image prompt for this kids nursery rhyme lyric line.\nLine: "${scene.lyricLine}"\nPrevious line: "${prevLine}"\nCharacter: ${characterOutput?.selected?.description || "cute cartoon child"}\nStyle: Pixar 3D, bright, colorful, child-friendly\nReturn only the image prompt, one sentence.`,
          sessionId: "",
          stepId: "06-scenes",
        }),
      });
      let promptText = "";
      if (streamRes.body) {
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6);
            if (raw === "[DONE]") break;
            try { const { text } = JSON.parse(raw); if (text) promptText += text; } catch {}
          }
        }
      }

      // Update scene with prompt
      const updatedScenes = scenes.map((s, i) => i === idx ? { ...s, prompt: promptText.trim() } : s);
      setScenes(updatedScenes);

      // Now generate image if API supported
      if (step.selectedTool.apiSupported && promptText) {
        const imgRes = await fetch("/api/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: step.selectedTool.id === "dalle3" ? "openai-image" : "stability",
            action: "generate",
            payload: { prompt: promptText },
          }),
        });
        const imgData = await imgRes.json();
        const imageUrl = imgData?.data?.[0]?.url || imgData?.artifacts?.[0]?.base64 || "";
        setScenes((prev) => prev.map((s, i) => i === idx ? { ...s, imageUrl, prompt: promptText } : s));
        setStepOutput("06-scenes", { scenes: updatedScenes, characterDescription: characterOutput?.selected?.description || "" });
      }
    } finally {
      setGeneratingIdx(-1);
    }
  }

  async function generateAll() {
    setGenerating(true);
    for (let i = 0; i < scenes.length; i++) {
      await generateScene(i);
    }
    setGenerating(false);
  }

  return (
    <StepCard step={step} isActive>
      <ToolSelector tools={tools} selected={step.selectedTool} onSelect={(t) => setStepTool("06-scenes", t)} />

      {!lyricsOutput && (
        <div className="p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl text-sm space-y-1">
          <p className="text-amber-300 font-semibold">Lyrics not available yet</p>
          <p className="text-slate-400">Complete and approve Step 2 (Lyrics) to load lyric lines here.</p>
        </div>
      )}

      {lyricsOutput && !characterOutput && (
        <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-400">
          Tip: Complete Step 5 (Character Design) first for consistent character images across all scenes.
        </div>
      )}

      {lyricsOutput && scenes.length === 0 && step.selectedTool && (
        <button onClick={initScenes} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all">
          Load {lyricLines.length} Lyric Lines →
        </button>
      )}

      {scenes.length > 0 && (
        <>
          {/* Progress */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{approvedCount}/{scenes.length} scenes approved</span>
            <button onClick={generateAll} disabled={generating}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-all">
              {generating ? "Generating all…" : "Generate All"}
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(approvedCount / scenes.length) * 100}%` }} />
          </div>

          {/* Scene rows */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {scenes.map((scene, i) => (
              <div key={scene.id} className={`flex gap-3 p-3 rounded-xl border transition-all
                ${scene.approved ? "border-green-700/40 bg-green-900/10" : "border-slate-700/50 bg-slate-800/40"}`}>
                {/* Image */}
                <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-slate-700 flex items-center justify-center">
                  {scene.imageUrl ? (
                    <img src={scene.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : generatingIdx === i ? (
                    <span className="text-blue-400 pulse-dot text-xl">⚡</span>
                  ) : (
                    <span className="text-slate-500 text-lg">🖼</span>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 font-semibold">[{scene.sectionLabel}]</p>
                  <p className="text-sm text-slate-200 truncate">{scene.lyricLine}</p>
                  {scene.prompt && <p className="text-xs text-slate-500 truncate mt-0.5">{scene.prompt}</p>}
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {!scene.approved && (
                    <button onClick={() => generateScene(i)} disabled={generatingIdx === i}
                      className="px-2 py-1 text-xs bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-all">
                      {generatingIdx === i ? "…" : "Gen"}
                    </button>
                  )}
                  <button onClick={() => {
                    const updated = scenes.map((s, j) => j === i ? { ...s, approved: !s.approved } : s);
                    setScenes(updated);
                    setStepOutput("06-scenes", { scenes: updated, characterDescription: "" });
                  }}
                    className={`px-2 py-1 text-xs rounded-lg transition-all
                      ${scene.approved ? "bg-green-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
                    {scene.approved ? "✓" : "OK"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {approvedCount === scenes.length && scenes.length > 0 && (
        <HumanReviewPanel stepId="06-scenes" output={scenes}
          onAction={(action) => {
            if (action.type === "approve") approveStep("06-scenes");
            else if (action.type === "back") setCurrentStep(4);
          }}
        >
          <p className="text-sm text-green-300 font-semibold">✓ All {scenes.length} scenes approved</p>
        </HumanReviewPanel>
      )}
    </StepCard>
  );
}
