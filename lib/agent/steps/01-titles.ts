import { parseJsonArray } from "../json-parser";

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

Return a JSON array of exactly 8 objects. Each object must have these keys:
- "title": the song title (string)
- "emoji": a single emoji (string)
- "ageRange": e.g. "2-5 years" (string)
- "hook": one sentence explaining why kids will love it (string, no newlines)
- "engagementScore": number from 1-10

Rules: No markdown, no preamble, no trailing text. Output ONLY the raw JSON array.`;
}

export function parseTitlesOutput(raw: string): TitleOption[] {
  return parseJsonArray<TitleOption>(raw).slice(0, 8);
}
