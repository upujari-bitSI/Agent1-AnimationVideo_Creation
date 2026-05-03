export type TransitionType = "cut" | "fade" | "slide" | "zoom" | "wipe";
export type CaptionStyle = "bubbly" | "bold" | "simple" | "animated";
export type ColorGrade = "vivid" | "warm" | "cool" | "natural" | "dreamy";
export type ExportResolution = "720p" | "1080p" | "4k";

export interface Caption {
  startMs: number;
  endMs: number;
  text: string;
}

export interface AssemblyConfig {
  transition: TransitionType;
  captionStyle: CaptionStyle;
  colorGrade: ColorGrade;
  resolution: ExportResolution;
  addSoundEffects: boolean;
}

export interface AssemblyOutput {
  config: AssemblyConfig;
  previewUrl?: string;
  finalUrl?: string;
  durationSeconds: number;
  status: "pending" | "rendering" | "complete" | "error";
  ffmpegCommand?: string;
}

export function buildFFmpegCommand(
  clips: string[],
  audioPath: string,
  outputPath: string,
  resolution: ExportResolution,
  transition: TransitionType
): string {
  const resMap: Record<ExportResolution, string> = {
    "720p": "1280:720",
    "1080p": "1920:1080",
    "4k": "3840:2160",
  };
  const scale = resMap[resolution];

  const inputs = clips.map((c) => `-i "${c}"`).join(" ");
  const filterInputs = clips.map((_, i) => `[${i}:v]scale=${scale},setsar=1[v${i}]`).join("; ");
  const concatInputs = clips.map((_, i) => `[v${i}]`).join("");
  const filterComplex = `"${filterInputs}; ${concatInputs}concat=n=${clips.length}:v=1:a=0[outv]"`;

  return `ffmpeg ${inputs} -i "${audioPath}" -filter_complex ${filterComplex} -map "[outv]" -map ${clips.length}:a -c:v libx264 -preset fast -crf 22 -c:a aac -shortest "${outputPath}"`;
}

export const DEFAULT_ASSEMBLY_CONFIG: AssemblyConfig = {
  transition: "fade",
  captionStyle: "bubbly",
  colorGrade: "vivid",
  resolution: "1080p",
  addSoundEffects: false,
};
