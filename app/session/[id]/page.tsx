"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { usePipelineStore, PipelineStep } from "@/store/pipeline";
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

// stepIndex → prerequisite step IDs that must be "approved" before running
const STEP_PREREQUISITES: Record<number, string[]> = {
  1: ["01-titles"],
  2: ["01-titles"],
  3: ["02-lyrics", "03-music-style"],
  4: ["02-lyrics"],
  5: ["02-lyrics", "05-character"],
  6: ["06-scenes"],
  7: ["04-music-gen", "07-animation"],
  8: ["01-titles", "02-lyrics"],
};

function getLockReason(stepIndex: number, steps: PipelineStep[]): string | null {
  const prereqs = STEP_PREREQUISITES[stepIndex];
  if (!prereqs) return null;
  const unmet = prereqs
    .map((id) => steps.find((s) => s.id === id))
    .filter((s) => s && s.status !== "approved")
    .map((s) => s!.name);
  if (unmet.length === 0) return null;
  return unmet.join(", ");
}

function LockBanner({ reason, onNavigate }: { reason: string; onNavigate?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex items-start gap-3 p-4 bg-amber-900/30 border border-amber-600/50 rounded-2xl"
    >
      <span className="text-xl flex-shrink-0 mt-0.5">🔒</span>
      <div className="flex-1 min-w-0">
        <p className="text-amber-300 font-bold text-sm">Step locked — view only</p>
        <p className="text-slate-300 text-xs mt-0.5">
          Complete first: <span className="text-amber-200 font-semibold">{reason}</span>
        </p>
      </div>
    </motion.div>
  );
}

export default function SessionPage() {
  const params = useParams();
  const id = params.id as string;
  const { sessionId, setSessionId, sessionTitle, setSettingsOpen, steps, currentStepIndex, resetSession } = usePipelineStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!id) return;
    // If persisted session id differs from URL → fresh session for this id.
    // If it matches → state is already hydrated from localStorage (resume).
    if (sessionId && sessionId !== id) {
      resetSession();
      setSessionId(id);
    } else if (!sessionId) {
      setSessionId(id);
    }
    setReady(true);
  }, [id, sessionId, setSessionId, resetSession]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-slate-400 text-sm">Loading session…</div>
      </div>
    );
  }

  const allApproved = steps.every((s) => s.status === "approved");
  const CurrentStep = STEP_COMPONENTS[currentStepIndex];
  const lockReason = getLockReason(currentStepIndex, steps);

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
                {lockReason && <LockBanner reason={lockReason} />}
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
