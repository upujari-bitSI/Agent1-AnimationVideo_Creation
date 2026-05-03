"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface SessionSummary {
  id: string;
  title: string;
  status: string;
  created_at: number;
  updated_at: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  in_progress: { label: "In Progress", color: "text-amber-300 bg-amber-900/30" },
  complete:    { label: "Complete",    color: "text-green-300 bg-green-900/30"  },
  paused:      { label: "Paused",      color: "text-slate-300 bg-slate-700/30"  },
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions || []))
      .finally(() => setLoading(false));
  }, []);

  async function deleteSession(id: string) {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    setDeleting(id);
    await fetch("/api/session", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <a href="/" className="text-slate-400 hover:text-white text-sm transition-colors">← Home</a>
        <span className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-fredoka)" }}>Session History</span>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {loading && (
          <div className="text-slate-400 text-sm text-center py-16">Loading sessions…</div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎵</div>
            <p className="text-slate-400 mb-4">No sessions yet.</p>
            <a href="/" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm inline-block">
              Start Your First Video →
            </a>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="space-y-3">
            {sessions.map((s, i) => {
              const cfg = STATUS_CONFIG[s.status] || { label: s.status, color: "text-slate-400 bg-slate-700/30" };
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-200 truncate">{s.title || "Untitled"}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Created {new Date(s.created_at).toLocaleDateString()} · Updated {new Date(s.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={`/session/${s.id}`}
                      className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-all"
                    >
                      Open →
                    </a>
                    <button
                      onClick={() => deleteSession(s.id)}
                      disabled={deleting === s.id}
                      className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold rounded-lg transition-all"
                    >
                      {deleting === s.id ? "…" : "Delete"}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
