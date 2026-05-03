"use client";

import { useEffect, useRef, useState } from "react";
import { usePipelineStore } from "@/store/pipeline";

interface Props {
  sessionId: string;
  stepId: string;
  prompt: string;
  systemPrompt?: string;
  onComplete?: (fullText: string) => void;
  /** Start streaming immediately on mount. Only fires ONCE per mount. */
  autoStart?: boolean;
}

export default function StreamingOutput({ sessionId, stepId, prompt, systemPrompt, onComplete, autoStart }: Props) {
  // Local state — not shared with other steps so streams don't interfere with each other
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [done, setDone] = useState(false);

  const { setStepStatus } = usePipelineStore();
  const fullTextRef = useRef("");
  const containerRef = useRef<HTMLDivElement>(null);
  // Guard: prevents React Strict Mode double-invocation and repeat auto-starts
  const startedRef = useRef(false);

  useEffect(() => {
    if (autoStart && !startedRef.current) {
      startedRef.current = true;
      startStream();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // empty deps — intentionally runs once on mount only

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [streamText]);

  async function startStream() {
    if (streaming) return; // block if already running
    setStreamText("");
    setDone(false);
    setStreaming(true);
    fullTextRef.current = "";
    setStepStatus(stepId, "running");

    try {
      const res = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, sessionId, stepId, system: systemPrompt }),
      });

      if (!res.body) throw new Error("No stream body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") {
            setStreaming(false);
            setDone(true);
            setStepStatus(stepId, "review");
            onComplete?.(fullTextRef.current);
            return;
          }
          try {
            const { text, error } = JSON.parse(raw);
            if (error) throw new Error(error);
            if (text) {
              fullTextRef.current += text;
              setStreamText((prev) => prev + text);
            }
          } catch { /* ignore malformed chunks */ }
        }
      }
    } catch (err) {
      setStreaming(false);
      setStepStatus(stepId, "error");
      const msg = err instanceof Error ? err.message : "Stream failed";
      setStreamText((prev) => prev + `\n\n❌ Error: ${msg}`);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Manual start button — only shown when not autoStart and not yet started */}
      {!autoStart && !streaming && !streamText && (
        <button
          onClick={startStream}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <span>▶</span> Run AI Generation
        </button>
      )}

      {(streaming || streamText) && (
        <div className="relative">
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
            {streaming ? (
              <>
                <span className="pulse-dot w-2 h-2 bg-blue-400 rounded-full inline-block" />
                <span className="text-blue-300 font-semibold">Claude is generating…</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
                <span className="text-green-300 font-semibold">Generation complete</span>
              </>
            )}
          </div>

          <div
            ref={containerRef}
            className="bg-slate-900/70 border border-slate-700 rounded-xl p-4 font-mono text-sm text-slate-200 max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed"
          >
            {streamText}
            {streaming && <span className="inline-block w-2 h-4 bg-blue-400 ml-0.5 animate-pulse" />}
          </div>

          {/* No re-run button here — regeneration is handled by HumanReviewPanel */}
          {done && (
            <p className="mt-1 text-xs text-slate-500">
              Use <span className="text-blue-400">↺ Regenerate</span> in the review panel below to redo this.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
