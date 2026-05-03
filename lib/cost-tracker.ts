export interface StepCost {
  stepId: string;
  stepName: string;
  toolName: string;
  tier: "free" | "paid";
  estimatedCost: number;
  actualCost: number;
}

export interface CostSummary {
  steps: StepCost[];
  totalEstimated: number;
  totalActual: number;
  projectedMonthly: (videosPerMonth: number) => number;
  monthlyToolCosts: number;
}

export const STEP_COST_ESTIMATES: Record<string, { name: string; claudeCost: number; freeCost: number }> = {
  "01-titles":      { name: "Theme & Titles",    claudeCost: 0.002, freeCost: 0 },
  "02-lyrics":      { name: "Lyrics",             claudeCost: 0.005, freeCost: 0 },
  "03-music-style": { name: "Music Style",        claudeCost: 0.002, freeCost: 0 },
  "04-music-gen":   { name: "Music Generation",   claudeCost: 8.00,  freeCost: 0 },
  "05-character":   { name: "Character Design",   claudeCost: 0.16,  freeCost: 0 },
  "06-scenes":      { name: "Scene Images",       claudeCost: 1.20,  freeCost: 0 },
  "07-animation":   { name: "Animation",          claudeCost: 2.40,  freeCost: 0 },
  "08-assembly":    { name: "Video Assembly",     claudeCost: 0,     freeCost: 0 },
  "09-youtube":     { name: "YouTube Metadata",   claudeCost: 0.003, freeCost: 0 },
};

export const MONTHLY_TOOL_COSTS: Record<string, number> = {
  "suno-pro":    8,
  "udio-pro":    10,
  "mureka-plus": 15,
  "kling-ai":    8,
  "pika-labs":   8,
  "runwayml":    15,
  "creatomate":  29,
};

export function calculateSessionCost(steps: StepCost[]): CostSummary {
  const totalEstimated = steps.reduce((s, c) => s + c.estimatedCost, 0);
  const totalActual = steps.reduce((s, c) => s + c.actualCost, 0);
  const monthlyToolCosts = 0; // computed when tools are chosen

  return {
    steps,
    totalEstimated,
    totalActual,
    projectedMonthly: (n: number) => totalActual * n + monthlyToolCosts,
    monthlyToolCosts,
  };
}

export function formatCost(n: number): string {
  if (n === 0) return "$0";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}
