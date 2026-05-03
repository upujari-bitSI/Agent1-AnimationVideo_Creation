import { parseJsonObject } from "../json-parser";

export interface YouTubeMetadata {
  titleOptions: string[];
  selectedTitle: string;
  description: string;
  tags: Array<{ tag: string; relevance: number }>;
  thumbnailText: string;
}

export function buildYouTubeMetaPrompt(title: string, lyricsSummary: string, themes: string[]): string {
  return `You are a YouTube SEO specialist for kids channels.

Song title: ${title}
Lyrics summary: ${lyricsSummary}
Themes: ${themes.join(", ")}
Target age: 2-6 years

Generate YouTube metadata as a JSON object with these exact keys:
{
  "titleOptions": ["title 1 (max 60 chars)", "title 2", "title 3"],
  "description": "250-300 word description with hook, what kids learn, lyrics preview, subscribe CTA, hashtags",
  "tags": [
    {"tag": "nursery rhymes", "relevance": 10},
    ...30 tags total...
  ],
  "thumbnailText": "max 4 words, big bold readable"
}

Rules for titles: include key search terms parents use, max 60 chars each.
Rules for tags: mix broad terms, specific terms, long-tail phrases.
Return only the JSON object. No markdown, no preamble.`;
}

export function parseYouTubeMetaOutput(raw: string): YouTubeMetadata {
  const parsed = parseJsonObject<YouTubeMetadata>(raw);
  return { ...parsed, selectedTitle: parsed.titleOptions?.[0] || "" };
}

export function buildLyricsSummary(rawLyrics: string): string {
  const lines = rawLyrics.split("\n").filter((l) => l.trim() && !l.startsWith("["));
  return lines.slice(0, 6).join(" | ");
}
