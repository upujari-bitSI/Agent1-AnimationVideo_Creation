export interface SceneImage {
  id: string;
  lyricLine: string;
  sectionLabel: string;
  prompt: string;
  imageUrl?: string;
  approved: boolean;
  regenerateCount: number;
}

export interface ScenesOutput {
  scenes: SceneImage[];
  characterDescription: string;
}

export function buildScenePromptRequest(
  title: string,
  characterDescription: string,
  lyricLine: string,
  previousLine: string
): string {
  return `You are a visual director for a kids animated video.

Song title: ${title}
Character description: ${characterDescription}
Lyric line: "${lyricLine}"
Scene context (previous line): "${previousLine}"

Generate a detailed image prompt for this lyric line:
- Scene must directly illustrate the action in the lyric
- Character must match description exactly
- Style: bright 3D cartoon animation, Pixar-inspired, ultra colorful
- Background: relevant, simple, not distracting
- No text in the image
- Camera angle: slightly low angle to feel kid-friendly
- Mood: cheerful, playful

Return only the image prompt. No explanation, no preamble.`;
}

export function extractLyricLines(sections: { label: string; lines: string[] }[]): { line: string; section: string }[] {
  const result: { line: string; section: string }[] = [];
  for (const section of sections) {
    for (const line of section.lines) {
      if (line.trim()) result.push({ line: line.trim(), section: section.label });
    }
  }
  return result;
}
