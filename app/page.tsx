"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { usePipelineStore } from "@/store/pipeline";
import { v4 as uuidv4 } from "uuid";

interface SessionSummary {
  id: string;
  title: string;
  status: string;
  created_at: number;
  updated_at: number;
}

export default function LandingPage() {
  const router = useRouter();
  const { resetSession, setSessionId, setSessionTitle, sessionId: lastSessionId, sessionTitle: lastSessionTitle, currentStepIndex: lastStepIdx } = usePipelineStore();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions || []))
      .catch(() => {});
  }, []);

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this session? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await fetch("/api/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (lastSessionId === id) resetSession();
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteAllSessions() {
    if (!confirm(`Delete ALL ${sessions.length} sessions? This cannot be undone.`)) return;
    await Promise.all(sessions.map((s) =>
      fetch("/api/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id }),
      })
    ));
    setSessions([]);
    resetSession();
  }

  async function startNewSession() {
    setLoading(true);
    const id = uuidv4();
    const sessionTitle = title.trim() || "New Nursery Rhyme";
    try {
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title: sessionTitle, pipelineState: {} }),
      });
    } catch {}
    resetSession();
    setSessionId(id);
    setSessionTitle(sessionTitle);
    router.push(`/session/${id}`);
  }

  const statusColor: Record<string, string> = {
    in_progress: "text-amber-300 bg-amber-900/30",
    complete:    "text-green-300 bg-green-900/30",
    paused:      "text-slate-300 bg-slate-700/30",
  };

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎵</span>
          <span className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-fredoka)" }}>
            RhymeForge
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm text-slate-400">
          <a href="/history" className="hover:text-white transition-colors">History</a>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <div className="text-6xl mb-6">🎬🎵✨</div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: "var(--font-fredoka)" }}>
            Create Monetizable Kids<br />Nursery Rhyme Videos
          </h1>
          <p className="text-lg text-slate-400 mb-8 leading-relaxed">
            A human-in-the-loop AI pipeline from idea to upload-ready YouTube video.
            You approve every step. You own every decision.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto mb-3">
            <input
              type="text"
              placeholder="Session title (optional)..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startNewSession()}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-sm"
            />
            <button
              onClick={startNewSession}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold rounded-xl transition-all text-sm flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? "Starting…" : "🚀 Start New Video"}
            </button>
          </div>

          {lastSessionId && (
            <div className="max-w-md mx-auto mb-6 flex items-center gap-2 p-3 bg-amber-900/20 border border-amber-700/40 rounded-xl text-left">
              <span className="text-xl">⏯</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-300 font-bold">Unfinished session</p>
                <p className="text-sm text-slate-200 truncate">{lastSessionTitle} <span className="text-xs text-slate-500">· step {lastStepIdx + 1}/9</span></p>
              </div>
              <button
                onClick={() => router.push(`/session/${lastSessionId}`)}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-lg whitespace-nowrap"
              >
                Resume →
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center text-xs">
            {["9-Step Pipeline", "Human-in-the-Loop", "Monetization Checks", "Session History", "Claude AI Powered", "Free & Paid Tools"].map((f) => (
              <span key={f} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-400">{f}</span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Steps overview */}
      <section className="px-6 py-12 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-2xl font-bold text-white mb-8" style={{ fontFamily: "var(--font-fredoka)" }}>
            The 9-Step Pipeline
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-9 gap-3">
            {[
              { name: "Theme & Title", emoji: "🏷" },
              { name: "Lyrics",        emoji: "📝" },
              { name: "Music Style",   emoji: "🎼" },
              { name: "Music Gen",     emoji: "🎵" },
              { name: "Character",     emoji: "🧒" },
              { name: "Scenes",        emoji: "🖼" },
              { name: "Animation",     emoji: "🎬" },
              { name: "Assembly",      emoji: "⚙️" },
              { name: "YouTube",       emoji: "▶️" },
            ].map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex flex-col items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-center"
              >
                <span className="text-2xl mb-1">{s.emoji}</span>
                <span className="text-xs text-slate-400 font-semibold leading-tight">{s.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <section className="px-6 py-8 border-t border-slate-800">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-fredoka)" }}>
                Recent Sessions
              </h2>
              <button
                onClick={deleteAllSessions}
                className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold rounded-lg transition-all"
                title="Delete all sessions"
              >
                🗑 Clear all
              </button>
            </div>
            <div className="space-y-2">
              {sessions.slice(0, 5).map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/40 hover:border-slate-600 transition-all"
                >
                  <a href={`/session/${s.id}`} className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-200 truncate">{s.title || "Untitled"}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{new Date(s.updated_at).toLocaleDateString()}</div>
                  </a>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${statusColor[s.status] || "text-slate-400 bg-slate-700/30"}`}>
                    {s.status.replace("_", " ")}
                  </span>
                  <button
                    onClick={(e) => deleteSession(s.id, e)}
                    disabled={deletingId === s.id}
                    className="px-2.5 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-300 text-xs font-semibold rounded-lg transition-all flex-shrink-0"
                  >
                    {deletingId === s.id ? "…" : "🗑"}
                  </button>
                </motion.div>
              ))}
            </div>
            <a href="/history" className="block text-center text-sm text-blue-400 hover:text-blue-300 mt-3 transition-colors">
              View all sessions →
            </a>
          </div>
        </section>
      )}
    </main>
  );
}
