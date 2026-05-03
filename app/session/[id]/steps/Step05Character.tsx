"use client";

import { useState } from "react";
import { usePipelineStore } from "@/store/pipeline";
import { TOOLS_BY_STEP } from "@/lib/agent/tools";
import {
  CharacterDesign, CharacterStyle, CharacterGender, CharacterSpecies, CharacterOutfit,
  buildCharacterImagePrompts, CharacterOption
} from "@/lib/agent/steps/05-character";
import StepCard from "@/components/StepCard";
import ToolSelector from "@/components/ToolSelector";
import HumanReviewPanel from "@/components/HumanReviewPanel";

const SPECIES_OPTIONS: { id: CharacterSpecies; label: string; emoji: string }[] = [
  { id: "human-child", label: "Human Child", emoji: "🧒" },
  { id: "animal",      label: "Animal",      emoji: "🐾" },
  { id: "fantasy",     label: "Fantasy",     emoji: "🧚" },
];
const GENDER_OPTIONS: { id: CharacterGender; label: string }[] = [
  { id: "any", label: "Any" }, { id: "boy", label: "Boy" }, { id: "girl", label: "Girl" }, { id: "neutral", label: "Neutral" },
];
const STYLE_OPTIONS: { id: CharacterStyle; label: string }[] = [
  { id: "cartoon-3d", label: "Cartoon 3D" }, { id: "flat-2d", label: "Flat 2D" }, { id: "claymation", label: "Claymation" },
];
const OUTFIT_OPTIONS: { id: CharacterOutfit; label: string }[] = [
  { id: "pajamas", label: "Pajamas" }, { id: "school", label: "School" }, { id: "adventure", label: "Adventure" }, { id: "seasonal", label: "Seasonal" },
];

export default function Step05Character() {
  const { steps, setStepTool, setStepOutput, approveStep, setCurrentStep } = usePipelineStore();
  const step = steps.find((s) => s.id === "05-character")!;

  const [design, setDesign] = useState<CharacterDesign>({ species: "human-child", gender: "any", style: "cartoon-3d", outfit: "adventure", description: "" });
  const [options, setOptions] = useState<CharacterOption[]>([]);
  const [selected, setSelected] = useState<CharacterOption | null>(null);
  const [generating, setGenerating] = useState(false);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [manualUrls, setManualUrls] = useState<string[]>(["", "", "", ""]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const tools = TOOLS_BY_STEP["05-character"];
  const isManual = step.selectedTool?.requiresManual ?? false;

  async function generateCharacters() {
    setGenerating(true);
    const imagePrompts = buildCharacterImagePrompts(design);
    setPrompts(imagePrompts);

    if (isManual) {
      // For manual tools: build placeholder options with empty imageUrl
      const opts: CharacterOption[] = imagePrompts.map((p, i) => ({
        id: `char-${i}`,
        imageUrl: "",
        prompt: p,
        description: `Character option ${i + 1}`,
      }));
      setOptions(opts);
      setManualUrls(["", "", "", ""]);
      setGenerating(false);
      return;
    }

    if (!step.selectedTool?.apiSupported) {
      setGenerating(false);
      return;
    }

    try {
      const generated: CharacterOption[] = [];
      for (let i = 0; i < imagePrompts.length; i++) {
        const res = await fetch("/api/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool: step.selectedTool?.id === "dalle3" ? "openai-image" : "stability", action: "generate", payload: { prompt: imagePrompts[i] } }),
        });
        const data = await res.json();
        const url = data?.data?.[0]?.url || data?.artifacts?.[0]?.base64 || "";
        generated.push({ id: `char-${i}`, imageUrl: url, prompt: imagePrompts[i], description: `Option ${i + 1}` });
      }
      setOptions(generated);
    } finally {
      setGenerating(false);
    }
  }

  function copyPrompt(idx: number) {
    navigator.clipboard.writeText(prompts[idx]).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }

  function applyManualUrls() {
    const updated = options.map((opt, i) => ({
      ...opt,
      imageUrl: manualUrls[i] || opt.imageUrl,
    }));
    setOptions(updated);
  }

  return (
    <StepCard step={step} isActive>
      <ToolSelector tools={tools} selected={step.selectedTool} onSelect={(t) => { setStepTool("05-character", t); setOptions([]); setSelected(null); setPrompts([]); }} />

      {/* Design controls */}
      <div className="grid grid-cols-2 gap-4">
        <PickRow label="Species" options={SPECIES_OPTIONS} value={design.species} onChange={(v) => setDesign({ ...design, species: v as CharacterSpecies })} />
        <PickRow label="Gender"  options={GENDER_OPTIONS}  value={design.gender}  onChange={(v) => setDesign({ ...design, gender: v as CharacterGender })} />
        <PickRow label="Style"   options={STYLE_OPTIONS}   value={design.style}   onChange={(v) => setDesign({ ...design, style: v as CharacterStyle })} />
        <PickRow label="Outfit"  options={OUTFIT_OPTIONS}  value={design.outfit}  onChange={(v) => setDesign({ ...design, outfit: v as CharacterOutfit })} />
      </div>

      {step.selectedTool && options.length === 0 && (
        <button onClick={generateCharacters} disabled={generating} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold rounded-xl transition-all">
          {generating ? "Generating Characters…" : (isManual ? "Show Prompts for Manual Tool →" : "Generate 4 Character Options →")}
        </button>
      )}

      {/* Manual tool: show prompts + URL paste inputs */}
      {isManual && prompts.length > 0 && (
        <div className="space-y-3 p-4 bg-slate-800/50 border border-amber-700/40 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <span className="text-sm font-semibold text-amber-300">Copy each prompt into <strong>{step.selectedTool!.name}</strong>, generate 4 images</span>
          </div>
          <div className="space-y-2">
            {prompts.map((p, i) => (
              <div key={i} className="relative">
                <pre className="text-xs bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-slate-300 whitespace-pre-wrap overflow-auto max-h-20 pr-16">
                  {p}
                </pre>
                <button
                  onClick={() => copyPrompt(i)}
                  className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded transition-all
                    ${copiedIdx === i ? "bg-green-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-300"}`}
                >
                  {copiedIdx === i ? "✓" : "Copy"}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <span className="text-sm font-semibold text-blue-300">Paste the image URLs back (or leave blank to use placeholder)</span>
          </div>
          <div className="space-y-3">
            {manualUrls.map((url, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-slate-900/40 rounded-lg border border-slate-700/40">
                {/* Preview thumbnail */}
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0 flex items-center justify-center">
                  {url ? (
                    <img src={url} alt={`Preview ${i+1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <span className="text-2xl">🧒</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-16 flex-shrink-0 font-semibold">Option {i + 1}:</span>
                    <input
                      type="text"
                      value={url.startsWith("blob:") ? "(uploaded file)" : url}
                      onChange={(e) => setManualUrls((prev) => prev.map((u, j) => j === i ? e.target.value : u))}
                      placeholder="Paste image URL or upload below"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const blobUrl = URL.createObjectURL(file);
                        setManualUrls((prev) => prev.map((u, j) => j === i ? blobUrl : u));
                      }}
                      className="block w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-slate-700 file:text-slate-200 file:text-xs file:cursor-pointer hover:file:bg-slate-600"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={applyManualUrls}
            className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm transition-all"
          >
            Confirm Options →
          </button>
        </div>
      )}

      {/* Character options grid */}
      {options.length > 0 && (!isManual || prompts.length === 0 || options[0].imageUrl !== "") && (
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt, i) => (
            <button key={opt.id} onClick={() => { setSelected(opt); setStepOutput("05-character", { design, options, selected: opt, locked: false }); }}
              className={`p-3 rounded-xl border-2 transition-all text-left
                ${selected?.id === opt.id ? "border-blue-500 bg-blue-900/20" : "border-slate-700 bg-slate-800/50 hover:border-slate-600"}`}>
              {opt.imageUrl ? (
                <img src={opt.imageUrl} alt={`Character ${i+1}`} className="w-full aspect-square object-cover rounded-lg mb-2" />
              ) : (
                <div className="w-full aspect-square bg-slate-700 rounded-lg mb-2 flex items-center justify-center text-4xl">🧒</div>
              )}
              <p className="text-xs text-slate-400 font-semibold">Option {i + 1}</p>
              {selected?.id === opt.id && <p className="text-xs text-blue-300 font-bold mt-1">✓ Selected</p>}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <HumanReviewPanel stepId="05-character" output={selected}
          onAction={(action) => {
            if (action.type === "approve") approveStep("05-character");
            else if (action.type === "back") setCurrentStep(3);
          }}
        >
          <p className="text-sm text-slate-300">Character locked for all scenes. <span className="text-green-300 font-semibold">✓ Character selected</span></p>
        </HumanReviewPanel>
      )}
    </StepCard>
  );
}

function PickRow({ label, options, value, onChange }: { label: string; options: { id: string; label: string; emoji?: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1.5 font-semibold">{label}:</p>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button key={o.id} onClick={() => onChange(o.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all
              ${value === o.id ? "bg-purple-700 border-purple-400 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"}`}>
            {o.emoji && <span className="mr-1">{o.emoji}</span>}{o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
