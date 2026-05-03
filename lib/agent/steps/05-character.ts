export type CharacterSpecies = "human-child" | "animal" | "fantasy";
export type CharacterGender = "any" | "boy" | "girl" | "neutral";
export type CharacterStyle = "cartoon-3d" | "flat-2d" | "claymation";
export type CharacterOutfit = "pajamas" | "school" | "adventure" | "seasonal";

export interface CharacterDesign {
  species: CharacterSpecies;
  gender: CharacterGender;
  style: CharacterStyle;
  outfit: CharacterOutfit;
  description: string;
}

export interface CharacterOption {
  id: string;
  imageUrl: string;
  prompt: string;
  description: string;
}

export interface CharacterOutput {
  design: CharacterDesign;
  options: CharacterOption[];
  selected: CharacterOption | null;
  locked: boolean;
}

export function buildCharacterPrompt(design: CharacterDesign): string {
  const speciesMap: Record<CharacterSpecies, string> = {
    "human-child": "cute human child",
    "animal": "adorable animal character",
    "fantasy": "whimsical fantasy creature",
  };
  const styleMap: Record<CharacterStyle, string> = {
    "cartoon-3d": "bright 3D cartoon animation style, Pixar-inspired",
    "flat-2d": "flat 2D vector illustration style, bold outlines",
    "claymation": "claymation stop-motion style, textured clay look",
  };

  return `Character design for a kids nursery rhyme video.
Subject: ${speciesMap[design.species]}, ${design.gender !== "any" ? design.gender : ""}
Style: ${styleMap[design.style]}
Outfit: ${design.outfit} outfit
Mood: cheerful, friendly, approachable
Background: simple white/pastel studio background
Full body visible, centered composition
Ultra colorful, high quality, child-friendly
No text, no watermarks`;
}

export function buildCharacterImagePrompts(design: CharacterDesign): string[] {
  const base = buildCharacterPrompt(design);
  const poses = [
    "standing, arms out, big smile, waving",
    "jumping with joy, excited expression",
    "sitting cross-legged, looking curious",
    "dancing, spinning, laughing",
  ];
  return poses.map((pose) => `${base}\nPose: ${pose}`);
}
