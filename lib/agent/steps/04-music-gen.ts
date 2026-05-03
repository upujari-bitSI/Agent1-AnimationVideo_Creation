import { ToolOption } from "@/store/pipeline";

export interface MusicTrack {
  id: string;
  url?: string;
  title: string;
  duration?: number;
  rating?: number;
}

export interface MusicGenOutput {
  tracks: MusicTrack[];
  selected: MusicTrack | null;
  manualInstructions?: string;
}

export function buildMusicGenPrompt(lyrics: string, sunoStyleTag: string, title: string): string {
  return `${sunoStyleTag}

[Title]: ${title}

${lyrics}`;
}

export function buildManualInstructions(tool: ToolOption, lyrics: string, styleTag: string): string {
  const toolUrls: Record<string, string> = {
    "suno-free": "https://suno.com",
    "udio-free": "https://udio.com",
  };
  const url = toolUrls[tool.id] || "https://suno.com";
  return `## Manual Music Generation Steps

1. Open **${tool.name}** at ${url}
2. In the style/prompt field, paste:
   \`\`\`
   ${styleTag}
   \`\`\`
3. In the lyrics field, paste the full lyrics
4. Generate 2-4 versions and rate them
5. Download your chosen track
6. Come back here and upload the audio file

⚠️ **Important**: Free tier music cannot be monetized on YouTube.`;
}

export async function generateMusicApi(
  tool: ToolOption,
  lyrics: string,
  styleTag: string,
  title: string
): Promise<MusicGenOutput> {
  if (tool.tier === "free" || tool.requiresManual) {
    return {
      tracks: [],
      selected: null,
      manualInstructions: buildManualInstructions(tool, lyrics, styleTag),
    };
  }

  // Paid API calls — stub for now, replace with actual SDK
  const res = await fetch("/api/tools", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tool: tool.id,
      action: "generate",
      payload: { lyrics, styleTag, title },
    }),
  });
  const data = await res.json();
  return data as MusicGenOutput;
}
