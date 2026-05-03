import { ToolOption } from "@/store/pipeline";

export type MotionIntensity = "subtle" | "moderate" | "dynamic";

export interface AnimatedClip {
  id: string;
  sceneId: string;
  imageUrl: string;
  videoUrl?: string;
  duration: number;
  motionIntensity: MotionIntensity;
  approved: boolean;
  trimIn: number;
  trimOut: number;
}

export interface AnimationOutput {
  clips: AnimatedClip[];
  totalDuration: number;
  continuousFlow: boolean;
}

export function buildAnimationPrompt(imageDescription: string, intensity: MotionIntensity): string {
  const intensityMap: Record<MotionIntensity, string> = {
    subtle:   "gentle camera pan, slight zoom, minimal character movement",
    moderate: "moderate character animation, light bouncing, environment movement",
    dynamic:  "energetic movement, character dancing, camera follows action, particle effects",
  };
  return `Animate this kids cartoon scene. ${intensityMap[intensity]}. Keep it cheerful and age-appropriate. Scene: ${imageDescription}`;
}

export async function generateAnimationApi(
  tool: ToolOption,
  imageUrl: string,
  prompt: string
): Promise<{ videoUrl?: string; manualInstructions?: string }> {
  if (tool.requiresManual) {
    return {
      manualInstructions: `## Manual Animation Steps

1. Open **${tool.name}**
2. Upload your image: ${imageUrl}
3. Enter this prompt: "${prompt}"
4. Generate a 3-5 second clip
5. Download and come back here to upload`,
    };
  }

  const res = await fetch("/api/tools", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool: tool.id, action: "animate", payload: { imageUrl, prompt } }),
  });
  const data = await res.json();
  return data;
}
