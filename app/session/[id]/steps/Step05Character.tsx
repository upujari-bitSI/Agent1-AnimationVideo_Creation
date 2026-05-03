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

  const tools = TOOLS_BY_STEP["05-character"];

  async function generateCharacters() {
    setGenerating(true);
    const imagePrompts = buildCharacterImagePrompts(design);
    setPrompts(imagePrompts);

    if (!step.selectedTool?.apiSupported) {
      const opts: CharacterOption[] = imagePrompts.map((p, i) => ({
        id: `char-${i}`,
        imageUrl: "",
        prompt: p,
        description: `Character option ${i + 1}`,
      }));
      setOptions(opts);
      setGenerating(false);
      return;
    }

    // Call image generation API
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

  return (
    <StepCard step={step} isActive>
      <ToolSelector tools={tools} selected={step.selectedTool} onSelect={(t) => setStepTool("05-character", t)} />

      {/* Design controls */}
      <div className="grid grid-cols-2 gap-4">
        <PickRow label="Species" options={SPECIES_OPTIONS} value={design.species} onChange={(v) => setDesign({ ...design, species: v as CharacterSpecies })} />
        <PickRow label="Gender"  options={GENDER_OPTIONS}  value={design.gender}  onChange={(v) => setDesign({ ...design, gender: v as CharacterGender })} />
        <PickRow label="Style"   options={STYLE_OPTIONS}   value={design.style}   onChange={(v) => setDesign({ ...design, style: v as CharacterStyle })} />
        <PickRow label="Outfit"  options={OUTFIT_OPTIONS}  value={design.outfit}  onChange={(v) => setDesign({ ...design, outfit: v as CharacterOutfit })} />
      </div>

      {step.selectedTool && options.length === 0 && (
        <button onClick={generateCharacters} disabled={generating} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold rounded-xl transition-all">
          {generating ? "Generating Characters…" : "Generate 4 Character Options →"}
        </button>
      )}

      {/* Character options grid */}
      {options.length > 0 && (
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

      {/* Show prompt for manual tools */}
      {step.selectedTool?.requiresManual && prompts.length > 0 && (
        <div className="p-4 bg-slate-800/60 border border-slate-600 rounded-xl space-y-2">
          <p className="text-xs text-amber-300 font-bold">Use these prompts in {step.selectedTool.name}:</p>
          {prompts.map((p, i) => (
            <pre key={i} className="text-xs text-slate-300 bg-slate-900 p-2 rounded overflow-auto">Option {i+1}: {p.slice(0, 120)}…</pre>
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
