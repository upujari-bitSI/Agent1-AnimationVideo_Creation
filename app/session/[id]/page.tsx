"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { usePipelineStore } from "@/store/pipeline";
import PipelineTracker from "@/components/PipelineTracker";
import CostEstimator from "@/components/CostEstimator";
import SettingsPanel from "@/components/SettingsPanel";
import ExportPanel from "@/components/ExportPanel";
import Step01Titles from "./steps/Step01Titles";
import Step02Lyrics from "./steps/Step02Lyrics";
import Step03MusicStyle from "./steps/Step03MusicStyle";
import Step04MusicGen from "./steps/Step04MusicGen";
import Step05Character from "./steps/Step05Character";
import Step06Scenes from "./steps/Step06Scenes";
import Step07Animation from "./steps/Step07Animation";
import Step08Assembly from "./steps/Step08Assembly";
import Step09YouTube from "./steps/Step09YouTube";

const STEP_COMPONENTS = [
  Step01Titles,
  Step02Lyrics,
  Step03MusicStyle,
  Step04MusicGen,
  Step05Character,
  Step06Scenes,
  Step07Animation,
  Step08Assembly,
  Step09YouTube,
];

export default function SessionPage() {
  const params = useParams();
  const id = params.id as string;
  const { sessionId, setSessionId, sessionTitle, setSettingsOpen, steps, currentStepIndex } = usePipelineStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sessionId && id) setSessionId(id);
    setReady(true);
  }, [id, sessionId, setSessionId]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-slate-400 text-sm">Loading session…</div>
      </div>
    );
  }

  const allApproved = steps.every((s) => s.status === "approved");
  const CurrentStep = STEP_COMPONENTS[currentStepIndex];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Top bar */}
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <a href="/" className="text-2xl flex-shrink-0" title="Home">🎵</a>
          <span
            className="text-lg font-bold text-white truncate"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            {sessionTitle}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <CostEstimator />
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <PipelineTracker />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStepIndex}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                {CurrentStep && <CurrentStep />}
              </motion.div>
            </AnimatePresence>

            {allApproved && <ExportPanel />}
          </div>
        </main>
      </div>

      <SettingsPanel />
    </div>
  );
}
