// Agent orchestrator — coordinates the pipeline state machine across all 9 steps.
// Each step runs: tool selection → AI generation → human review → approval → next step.

export type StepId =
  | "01-titles"
  | "02-lyrics"
  | "03-music-style"
  | "04-music-gen"
  | "05-character"
  | "06-scenes"
  | "07-animation"
  | "08-assembly"
  | "09-youtube";

export const STEP_ORDER: StepId[] = [
  "01-titles",
  "02-lyrics",
  "03-music-style",
  "04-music-gen",
  "05-character",
  "06-scenes",
  "07-animation",
  "08-assembly",
  "09-youtube",
];

export function getNextStep(current: StepId): StepId | null {
  const idx = STEP_ORDER.indexOf(current);
  if (idx === -1 || idx >= STEP_ORDER.length - 1) return null;
  return STEP_ORDER[idx + 1];
}

export function getPrevStep(current: StepId): StepId | null {
  const idx = STEP_ORDER.indexOf(current);
  if (idx <= 0) return null;
  return STEP_ORDER[idx - 1];
}

export function isStepUnlocked(stepId: StepId, approvedSteps: Set<StepId>): boolean {
  const idx = STEP_ORDER.indexOf(stepId);
  if (idx === 0) return true;
  const prev = STEP_ORDER[idx - 1];
  return approvedSteps.has(prev);
}
