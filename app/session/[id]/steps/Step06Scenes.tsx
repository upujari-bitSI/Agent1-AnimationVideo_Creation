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

  const stored = step.output as { scenes?: SceneImage[] } | null;
  const [scenes, setScenes] = useState<SceneImage[]>(stored?.scenes ?? []);
  const [generating, setGenerating] = useState(false);
  const [generatingIdx, setGeneratingIdx] = useState(-1);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const tools = TOOLS_BY_STEP["06-scenes"];
  const lyricLines = lyricsOutput ? extractLyricLines(lyricsOutput.sections) : [];
  const approvedCount = scenes.filter((s) => s.approved).length;

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCheckAll() {
    if (checkedIds.size === scenes.length) setCheckedIds(new Set());
    else setCheckedIds(new Set(scenes.map((s) => s.id)));
  }

  function approveSelected() {
    const updated = scenes.map((s) => checkedIds.has(s.id) ? { ...s, approved: true } : s);
    setScenes(updated);
    setStepOutput("06-scenes", { scenes: updated, characterDescription: characterOutput?.selected?.description || "" });
    setCheckedIds(new Set());
  }

  function unapproveSelected() {
    const updated = scenes.map((s) => checkedIds.has(s.id) ? { ...s, approved: false } : s);
    setScenes(updated);
    setStepOutput("06-scenes", { scenes: updated, characterDescription: characterOutput?.selected?.description || "" });
    setCheckedIds(new Set());
  }

  function handleSceneUpload(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const updated = scenes.map((s, j) => j === idx ? { ...s, imageUrl: url } : s);
    setScenes(updated);
    setStepOutput("06-scenes", { scenes: updated, characterDescription: characterOutput?.selected?.description || "" });
  }

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

          {/* Bulk-action toolbar */}
          <div className="flex items-center gap-2 p-2 bg-slate-900/50 border border-slate-700/50 rounded-xl">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={checkedIds.size === scenes.length && scenes.length > 0}
                onChange={toggleCheckAll}
                className="accent-blue-500 w-4 h-4"
              />
              <span>Select all</span>
            </label>
            <span className="text-xs text-slate-500 ml-2">{checkedIds.size} selected</span>
            <div className="ml-auto flex gap-1.5">
              <button onClick={approveSelected} disabled={checkedIds.size === 0}
                className="px-3 py-1 text-xs font-bold bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white rounded-lg">
                &#x2713; Approve selected
              </button>
              <button onClick={unapproveSelected} disabled={checkedIds.size === 0}
                className="px-3 py-1 text-xs font-bold bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 rounded-lg">
                Unapprove
              </button>
            </div>
          </div>

          {/* Scene rows — larger image previews */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {scenes.map((scene, i) => (
              <div key={scene.id} className={`flex gap-3 p-3 rounded-xl border transition-all
                ${scene.approved ? "border-green-700/40 bg-green-900/10" : "border-slate-700/50 bg-slate-800/40"}`}>
                {/* Checkbox */}
                <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={checkedIds.has(scene.id)}
                    onChange={() => toggleCheck(scene.id)}
                    className="accent-blue-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-500">{i + 1}</span>
                </div>
                {/* Image (large) */}
                <button
                  type="button"
                  onClick={() => scene.imageUrl && setLightboxUrl(scene.imageUrl)}
                  className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-slate-700 flex items-center justify-center cursor-zoom-in hover:ring-2 hover:ring-blue-500 transition-all"
                  disabled={!scene.imageUrl}
                >
                  {scene.imageUrl ? (
                    <img src={scene.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : generatingIdx === i ? (
                    <span className="text-blue-400 pulse-dot text-3xl">⚡</span>
                  ) : (
                    <span className="text-slate-500 text-3xl">🖼</span>
                  )}
                </button>
                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs text-slate-400 font-semibold">[{scene.sectionLabel}]</p>
                  <p className="text-sm text-slate-200">{scene.lyricLine}</p>
                  {scene.prompt && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{scene.prompt}</p>}
                  <label className="block pt-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSceneUpload(i, e)}
                      className="block w-full text-xs text-slate-400 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:bg-slate-700 file:text-slate-200 file:text-[10px] file:cursor-pointer hover:file:bg-slate-600"
                    />
                  </label>
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
                    setStepOutput("06-scenes", { scenes: updated, characterDescription: characterOutput?.selected?.description || "" });
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

      {/* Lightbox modal */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6 cursor-zoom-out"
        >
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full rounded-xl shadow-2xl" />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-full text-lg font-bold"
          >
            ✕
          </button>
        </div>
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
