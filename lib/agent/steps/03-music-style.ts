export type StylePreset = "bouncy-pop" | "lullaby" | "march" | "reggae" | "jazz" | "rock-lite" | "classical";
export type TempoPreference = "slow" | "medium" | "fast";
export type EnergyLevel = "calm" | "moderate" | "energetic";
export type VocalType = "child" | "female-adult" | "male-adult" | "animated";

export interface MusicStyleOutput {
  styleDescription: string;
  tempo: string;
  mood: string;
  instruments: string[];
  vocalStyle: string;
  sunoStyleTag: string;
  avoidances: string[];
  preset: StylePreset;
}

export const STYLE_PRESETS: { id: StylePreset; label: string; emoji: string }[] = [
  { id: "bouncy-pop",  label: "Bouncy Pop",      emoji: "🎵" },
  { id: "lullaby",     label: "Lullaby",          emoji: "🌙" },
  { id: "march",       label: "March / Parade",   emoji: "🥁" },
  { id: "reggae",      label: "Reggae / Island",  emoji: "🌴" },
  { id: "jazz",        label: "Jazz Lite",        emoji: "🎷" },
  { id: "rock-lite",   label: "Rock Lite",        emoji: "🎸" },
  { id: "classical",   label: "Classical Light",  emoji: "🎻" },
];

export function buildMusicStylePrompt(
  title: string,
  preset: StylePreset,
  tempo: TempoPreference,
  energy: EnergyLevel,
  vocal: VocalType
): string {
  return `You are a kids music producer. Create a detailed music style brief.

Song title: ${title}
Style preset: ${preset}
Tempo preference: ${tempo}
Energy level: ${energy}
Vocal type: ${vocal}

Return a JSON object with these exact keys:
{
  "styleDescription": "2 sentence style overview",
  "tempo": "e.g. Moderately fast, 110-120 BPM",
  "mood": "e.g. Cheerful, playful, energetic",
  "instruments": ["ukulele", "hand claps", "xylophone"],
  "vocalStyle": "e.g. Light, bright, singalong friendly",
  "sunoStyleTag": "compact style tag for Suno input",
  "avoidances": ["heavy bass", "minor keys"]
}

CRITICAL: Do not reference any real artist, band, or existing song. Return only the JSON object, no markdown.`;
}

export function parseMusicStyleOutput(raw: string): MusicStyleOutput {
  const clean = raw.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse music style JSON");
  return JSON.parse(match[0]) as MusicStyleOutput;
}
