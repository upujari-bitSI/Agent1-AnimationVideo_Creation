"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePipelineStore } from "@/store/pipeline";

const API_KEYS = [
  { key: "ANTHROPIC_API_KEY",       label: "Anthropic (Claude)",     required: true  },
  { key: "SUNO_API_KEY",            label: "Suno Pro (Music)",       required: false },
  { key: "UDIO_API_KEY",            label: "Udio Pro (Music)",       required: false },
  { key: "OPENAI_API_KEY",          label: "OpenAI (DALL-E 3)",      required: false },
  { key: "STABILITY_API_KEY",       label: "Stability AI",           required: false },
  { key: "IDEOGRAM_API_KEY",        label: "Ideogram",               required: false },
  { key: "KLING_API_KEY",           label: "Kling AI (Animation)",   required: false },
  { key: "RUNWAY_API_KEY",          label: "RunwayML (Animation)",   required: false },
  { key: "YOUTUBE_CLIENT_ID",       label: "YouTube OAuth Client ID",required: false },
  { key: "YOUTUBE_CLIENT_SECRET",   label: "YouTube OAuth Secret",   required: false },
  { key: "CREATOMATE_API_KEY",      label: "Creatomate",             required: false },
];

export default function SettingsPanel() {
  const { settingsOpen, setSettingsOpen, videosPerMonth, setVideosPerMonth } = usePipelineStore();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AnimatePresence>
      {settingsOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSettingsOpen(false)}
            className="fixed inset-0 bg-black/60 z-40"
          />
          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 overflow-y-auto border-l border-slate-700"
            style={{ backgroundColor: "var(--bg-secondary)" }}
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-fredoka)" }}>
                  ⚙ Settings
                </h2>
                <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
              </div>

              {/* API Keys */}
              <section>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">API Keys</h3>
                <p className="text-xs text-slate-500 mb-3">Keys are stored in <code className="bg-slate-800 px-1 rounded">.env.local</code> — restart the dev server after saving.</p>
                <div className="space-y-3">
                  {API_KEYS.map(({ key, label, required }) => (
                    <div key={key}>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1">
                        {label}
                        {required && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type="password"
                        placeholder={`Enter ${key}…`}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Pipeline defaults */}
              <section>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Pipeline Defaults</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Videos per month target: <span className="text-blue-300">{videosPerMonth}</span>
                    </label>
                    <input
                      type="range" min={1} max={100} value={videosPerMonth}
                      onChange={(e) => setVideosPerMonth(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>1</span><span>50</span><span>100</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Save */}
              <button
                onClick={handleSave}
                className={`w-full py-3 rounded-xl font-bold transition-all
                  ${saved ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"}`}
              >
                {saved ? "✓ Saved!" : "Save Settings"}
              </button>

              <p className="text-xs text-slate-600 text-center">
                Note: API key persistence requires a server-side implementation. Currently displayed for UX preview.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
