"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { StepCost } from "@/lib/cost-tracker";

export type StepStatus = "idle" | "running" | "review" | "approved" | "error";

export type ToolTier = "free" | "paid";

export interface ToolOption {
  id: string;
  name: string;
  tier: ToolTier;
  costPerUse: string;
  monthlyPlan?: string;
  commercialOk: boolean;
  quality: 1 | 2 | 3;
  speed: "slow" | "medium" | "fast";
  requiresManual: boolean;
  apiSupported: boolean;
  credentialKey?: string;
}

export interface PipelineStep {
  id: string;
  name: string;
  description: string;
  estimatedTime: string;
  status: StepStatus;
  selectedTool: ToolOption | null;
  output: unknown;
  userEdits: unknown;
  regenerateCount: number;
  timeElapsed: number;
  cost: number;
  notes: string;
}

export interface MonetizationCheck {
  music: boolean;
  images: boolean;
  animation: boolean;
  overall: boolean;
  warnings: string[];
}

export interface PipelineState {
  sessionId: string | null;
  sessionTitle: string;
  currentStepIndex: number;
  steps: PipelineStep[];
  costs: StepCost[];
  totalCost: number;
  videosPerMonth: number;
  monetization: MonetizationCheck;
  streamingText: string;
  isStreaming: boolean;
  settingsOpen: boolean;

  // Actions
  setSessionId: (id: string) => void;
  setSessionTitle: (title: string) => void;
  setCurrentStep: (index: number) => void;
  setStepStatus: (stepId: string, status: StepStatus) => void;
  setStepOutput: (stepId: string, output: unknown) => void;
  setStepTool: (stepId: string, tool: ToolOption) => void;
  setStepNotes: (stepId: string, notes: string) => void;
  incrementRegenerate: (stepId: string) => void;
  setStepUserEdits: (stepId: string, edits: unknown) => void;
  approveStep: (stepId: string) => void;
  addCost: (cost: StepCost) => void;
  setStreamingText: (text: string) => void;
  appendStreamingText: (chunk: string) => void;
  setIsStreaming: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  setVideosPerMonth: (n: number) => void;
  updateMonetization: () => void;
  resetSession: () => void;
}

const INITIAL_STEPS: PipelineStep[] = [
  { id: "01-titles",      name: "Theme & Title",       description: "Select themes and pick a song title from AI-generated options",      estimatedTime: "~30 sec", status: "idle", selectedTool: null, output: null, userEdits: null, regenerateCount: 0, timeElapsed: 0, cost: 0, notes: "" },
  { id: "02-lyrics",      name: "Lyrics",              description: "Generate full nursery rhyme lyrics with editable sections",            estimatedTime: "~45 sec", status: "idle", selectedTool: null, output: null, userEdits: null, regenerateCount: 0, timeElapsed: 0, cost: 0, notes: "" },
  { id: "03-music-style", name: "Music Style",         description: "Define tempo, instruments, mood, and vocal style for the song",       estimatedTime: "~20 sec", status: "idle", selectedTool: null, output: null, userEdits: null, regenerateCount: 0, timeElapsed: 0, cost: 0, notes: "" },
  { id: "04-music-gen",   name: "Music Generation",    description: "Generate audio tracks using AI music tools",                          estimatedTime: "2–5 min", status: "idle", selectedTool: null, output: null, userEdits: null, regenerateCount: 0, timeElapsed: 0, cost: 0, notes: "" },
  { id: "05-character",   name: "Character Design",    description: "Generate and lock a consistent main character for all scenes",        estimatedTime: "~1 min",  status: "idle", selectedTool: null, output: null, userEdits: null, regenerateCount: 0, timeElapsed: 0, cost: 0, notes: "" },
  { id: "06-scenes",      name: "Scene Images",        description: "Generate one image per lyric section with character consistency",     estimatedTime: "3–8 min", status: "idle", selectedTool: null, output: null, userEdits: null, regenerateCount: 0, timeElapsed: 0, cost: 0, notes: "" },
  { id: "07-animation",   name: "Animation",           description: "Animate each scene image into short video clips",                     estimatedTime: "5–15 min", status: "idle", selectedTool: null, output: null, userEdits: null, regenerateCount: 0, timeElapsed: 0, cost: 0, notes: "" },
  { id: "08-assembly",    name: "Video Assembly",      description: "Combine clips, music, captions, and transitions into final video",    estimatedTime: "2–5 min", status: "idle", selectedTool: null, output: null, userEdits: null, regenerateCount: 0, timeElapsed: 0, cost: 0, notes: "" },
  { id: "09-youtube",     name: "YouTube Metadata",    description: "Generate SEO-optimized titles, description, tags, and thumbnail",    estimatedTime: "~30 sec", status: "idle", selectedTool: null, output: null, userEdits: null, regenerateCount: 0, timeElapsed: 0, cost: 0, notes: "" },
];

export const usePipelineStore = create<PipelineState>()(persist((set, get) => ({
  sessionId: null,
  sessionTitle: "New Nursery Rhyme",
  currentStepIndex: 0,
  steps: INITIAL_STEPS.map((s) => ({ ...s })),
  costs: [],
  totalCost: 0,
  videosPerMonth: 10,
  monetization: { music: false, images: false, animation: false, overall: false, warnings: [] },
  streamingText: "",
  isStreaming: false,
  settingsOpen: false,

  setSessionId: (id) => set({ sessionId: id }),
  setSessionTitle: (title) => set({ sessionTitle: title }),
  setCurrentStep: (index) => set({ currentStepIndex: index }),

  setStepStatus: (stepId, status) =>
    set((s) => ({ steps: s.steps.map((st) => st.id === stepId ? { ...st, status } : st) })),

  setStepOutput: (stepId, output) =>
    set((s) => ({ steps: s.steps.map((st) => st.id === stepId ? { ...st, output } : st) })),

  setStepTool: (stepId, tool) =>
    set((s) => {
      const steps = s.steps.map((st) => st.id === stepId ? { ...st, selectedTool: tool } : st);
      return { steps };
    }),

  setStepNotes: (stepId, notes) =>
    set((s) => ({ steps: s.steps.map((st) => st.id === stepId ? { ...st, notes } : st) })),

  incrementRegenerate: (stepId) =>
    set((s) => ({ steps: s.steps.map((st) => st.id === stepId ? { ...st, regenerateCount: st.regenerateCount + 1 } : st) })),

  setStepUserEdits: (stepId, edits) =>
    set((s) => ({ steps: s.steps.map((st) => st.id === stepId ? { ...st, userEdits: edits } : st) })),

  approveStep: (stepId) => {
    const { steps, currentStepIndex } = get();
    const idx = steps.findIndex((s) => s.id === stepId);
    const updated = steps.map((st) => st.id === stepId ? { ...st, status: "approved" as StepStatus } : st);
    const nextIdx = idx + 1 < steps.length ? idx + 1 : currentStepIndex;
    set({ steps: updated, currentStepIndex: nextIdx });
    get().updateMonetization();
  },

  addCost: (cost) =>
    set((s) => {
      const existing = s.costs.findIndex((c) => c.stepId === cost.stepId);
      const costs = existing >= 0
        ? s.costs.map((c, i) => i === existing ? cost : c)
        : [...s.costs, cost];
      const totalCost = costs.reduce((acc, c) => acc + (c.actualCost || c.estimatedCost), 0);
      return { costs, totalCost };
    }),

  setStreamingText: (text) => set({ streamingText: text }),
  appendStreamingText: (chunk) => set((s) => ({ streamingText: s.streamingText + chunk })),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setVideosPerMonth: (n) => set({ videosPerMonth: n }),

  updateMonetization: () => {
    const { steps } = get();
    const musicStep = steps.find((s) => s.id === "04-music-gen");
    const imagesStep = steps.find((s) => s.id === "06-scenes");
    const animStep = steps.find((s) => s.id === "07-animation");

    const music = musicStep?.selectedTool?.commercialOk ?? false;
    const images = imagesStep?.selectedTool?.commercialOk ?? false;
    const animation = animStep?.selectedTool?.commercialOk ?? false;
    const overall = music && images && animation;

    const warnings: string[] = [];
    if (!music) warnings.push("Music tool does not include commercial license");
    if (!images) warnings.push("Image tool does not include commercial license");
    if (!animation) warnings.push("Animation tool does not include commercial license");

    set({ monetization: { music, images, animation, overall, warnings } });
  },

  resetSession: () =>
    set({
      sessionId: null,
      sessionTitle: "New Nursery Rhyme",
      currentStepIndex: 0,
      steps: INITIAL_STEPS.map((s) => ({ ...s })),
      costs: [],
      totalCost: 0,
      streamingText: "",
      isStreaming: false,
      monetization: { music: false, images: false, animation: false, overall: false, warnings: [] },
    }),
}), {
  name: "rhymeforge-pipeline",
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    sessionId: state.sessionId,
    sessionTitle: state.sessionTitle,
    currentStepIndex: state.currentStepIndex,
    steps: state.steps,
    costs: state.costs,
    totalCost: state.totalCost,
    videosPerMonth: state.videosPerMonth,
    monetization: state.monetization,
  }),
}));
