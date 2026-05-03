"use client";

import { motion } from "framer-motion";
import { usePipelineStore } from "@/store/pipeline";

export default function ExportPanel() {
  const { steps, monetization, sessionTitle } = usePipelineStore();
  const allApproved = steps.every((s) => s.status === "approved");

  const youtubeStep = steps.find((s) => s.id === "09-youtube");
  const meta = youtubeStep?.output as Record<string, unknown> | null;

  const checklist = [
    { label: "Music commercial license",    ok: monetization.music     },
    { label: "Images commercial license",   ok: monetization.images    },
    { label: "Animation commercial license",ok: monetization.animation },
    { label: "Metadata ready",              ok: !!meta                 },
    { label: "Thumbnail ready",             ok: false                  },
  ];

  if (!allApproved) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 border-green-500/40 overflow-hidden"
      style={{ backgroundColor: "var(--bg-card)" }}
    >
      {/* Header */}
      <div className="px-6 py-5 bg-green-900/20 border-b border-green-700/30 flex items-center gap-3">
        <span className="text-3xl">🎉</span>
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-fredoka)" }}>
            Your video is ready!
          </h2>
          <p className="text-sm text-green-300">All pipeline steps approved — package and publish</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Monetization checklist */}
        <div>
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">YouTube Checklist</h3>
          <div className="space-y-2">
            {checklist.map(({ label, ok }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <span className={`text-base ${ok ? "text-green-400" : "text-red-400"}`}>
                  {ok ? "✅" : "❌"}
                </span>
                <span className={ok ? "text-slate-200" : "text-slate-400"}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Download buttons */}
        <div>
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Export</h3>
          <div className="grid grid-cols-2 gap-3">
            <DownloadBtn icon="🎬" label="Video (MP4)" color="bg-blue-700 hover:bg-blue-600" onClick={() => alert("Video export requires FFmpeg assembly to complete first.")} />
            <DownloadBtn icon="🖼" label="Thumbnail (PNG)" color="bg-purple-700 hover:bg-purple-600" onClick={() => alert("Thumbnail export coming soon.")} />
            <DownloadBtn icon="📝" label="Metadata (TXT)" color="bg-slate-700 hover:bg-slate-600" onClick={() => exportMetadata(sessionTitle, meta)} />
            <DownloadBtn icon="📦" label="Full ZIP" color="bg-amber-700 hover:bg-amber-600" onClick={() => alert("ZIP export requires all assets to be generated.")} />
          </div>
        </div>

        {/* YouTube upload */}
        <div className="p-4 border border-slate-700 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-200">Upload to YouTube</div>
              <div className="text-xs text-slate-400 mt-0.5">Requires YouTube OAuth connection</div>
            </div>
            <button className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all">
              Connect YouTube →
            </button>
          </div>
        </div>

        {/* Copy metadata */}
        {meta && (
          <button
            onClick={() => {
              const text = JSON.stringify(meta, null, 2);
              navigator.clipboard.writeText(text);
              alert("Metadata copied to clipboard!");
            }}
            className="w-full py-2.5 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 rounded-xl transition-all text-sm font-semibold"
          >
            📋 Copy All Metadata to Clipboard
          </button>
        )}
      </div>
    </motion.div>
  );
}

function DownloadBtn({ icon, label, color, onClick }: { icon: string; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-white font-semibold text-sm transition-all ${color}`}
    >
      <span>{icon}</span> {label}
    </button>
  );
}

function exportMetadata(title: string, meta: Record<string, unknown> | null) {
  if (!meta) { alert("No metadata generated yet."); return; }
  const text = `Title: ${title}\n\n${JSON.stringify(meta, null, 2)}`;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "youtube-metadata.txt"; a.click();
  URL.revokeObjectURL(url);
}
