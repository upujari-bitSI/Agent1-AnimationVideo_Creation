export type LyricsLength = "short" | "medium" | "long";

export interface LyricsSection {
  label: string;
  lines: string[];
}

export interface LyricsOutput {
  title: string;
  length: LyricsLength;
  sections: LyricsSection[];
  rawText: string;
  readingLevel: string;
}

const LENGTH_LABELS: Record<LyricsLength, string> = {
  short: "Short (1.5 min)",
  medium: "Medium (2.5 min)",
  long: "Long (3.5 min)",
};

export function buildLyricsPrompt(title: string, themes: string[], length: LyricsLength): string {
  return `You are a professional kids song lyricist. Write original, copyright-free nursery rhyme lyrics.

Title: ${title}
Target length: ${LENGTH_LABELS[length]}
Age group: 2-6 years
Themes: ${themes.join(", ")}

Requirements:
- 100% original — do not reference or copy any existing song
- Simple vocabulary (max 2-syllable words preferred)
- Strong rhyme scheme (AABB or ABAB)
- Repetitive chorus kids can memorize in 1-2 listens
- Include: Intro (4 lines), Verse 1 (8 lines), Chorus (4 lines), Verse 2 (8 lines), Chorus (4 lines), Bridge (4 lines), Outro (4 lines)
- Mark each section clearly with [INTRO], [VERSE 1], [CHORUS], [VERSE 2], [BRIDGE], [OUTRO]
- Fun, cheerful, age-appropriate — avoid any scary or sad themes

Write the full lyrics now:`;
}

export function parseLyricsOutput(raw: string, title: string, length: LyricsLength): LyricsOutput {
  const sectionRegex = /\[(INTRO|VERSE \d+|CHORUS|BRIDGE|OUTRO)\]([\s\S]*?)(?=\[(?:INTRO|VERSE \d+|CHORUS|BRIDGE|OUTRO)\]|$)/gi;
  const sections: LyricsSection[] = [];
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(raw)) !== null) {
    const label = match[1].trim();
    const lines = match[2].trim().split("\n").map((l) => l.trim()).filter(Boolean);
    sections.push({ label, lines });
  }

  // Fallback if regex doesn't match
  if (sections.length === 0) {
    sections.push({ label: "LYRICS", lines: raw.split("\n").map((l) => l.trim()).filter(Boolean) });
  }

  // Estimate reading level from vocabulary
  const words = raw.split(/\s+/);
  const avgWordLen = words.reduce((s, w) => s + w.replace(/[^a-z]/gi, "").length, 0) / (words.length || 1);
  const readingLevel = avgWordLen < 4.5 ? "Preschool (2-4 years)" : avgWordLen < 5.5 ? "Early (4-6 years)" : "Primary (6-8 years)";

  return { title, length, sections, rawText: raw, readingLevel };
}
