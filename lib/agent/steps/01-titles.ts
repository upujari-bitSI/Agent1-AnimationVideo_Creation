export interface TitleOption {
  title: string;
  emoji: string;
  ageRange: string;
  hook: string;
  engagementScore: number;
}

export interface TitlesOutput {
  themes: string[];
  titles: TitleOption[];
  selected: TitleOption | null;
}

export function buildTitlesPrompt(themes: string[]): string {
  return `You are a kids content strategist. Generate exactly 8 original nursery rhyme title ideas.
Themes selected by user: ${themes.join(", ")}

For each title return a JSON object:
{
  "title": string,
  "emoji": string,
  "ageRange": string,
  "hook": string,
  "engagementScore": number
}

Return a JSON array of exactly 8 objects. No markdown, no preamble, no trailing text — only the JSON array.`;
}

export function parseTitlesOutput(raw: string): TitleOption[] {
  try {
    const clean = raw.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const arr = JSON.parse(clean);
    if (!Array.isArray(arr)) throw new Error("Not an array");
    return arr.slice(0, 8) as TitleOption[];
  } catch {
    // Try to find a JSON array in the text
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]) as TitleOption[];
    }
    throw new Error("Could not parse titles JSON");
  }
}
