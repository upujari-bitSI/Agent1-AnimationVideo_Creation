"use client";

import { useEffect, useRef } from "react";
import { usePipelineStore } from "@/store/pipeline";

interface Props {
  sessionId: string;
  stepId: string;
  prompt: string;
  systemPrompt?: string;
  onComplete?: (fullText: string) => void;
  autoStart?: boolean;
}

export default function StreamingOutput({ sessionId, stepId, prompt, systemPrompt, onComplete, autoStart }: Props) {
  const { streamingText, isStreaming, setStreamingText, appendStreamingText, setIsStreaming, setStepStatus } = usePipelineStore();
  const fullTextRef = useRef("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoStart) startStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [streamingText]);

  async function startStream() {
    setStreamingText("");
    setIsStreaming(true);
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
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") {
            setIsStreaming(false);
            setStepStatus(stepId, "review");
            onComplete?.(fullTextRef.current);
            return;
          }
          try {
            const { text, error } = JSON.parse(raw);
            if (error) throw new Error(error);
            if (text) {
              fullTextRef.current += text;
              appendStreamingText(text);
            }
          } catch {}
        }
      }
    } catch (err) {
      setIsStreaming(false);
      setStepStatus(stepId, "error");
      const msg = err instanceof Error ? err.message : "Stream failed";
      appendStreamingText(`\n\n❌ Error: ${msg}`);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!isStreaming && !streamingText && (
        <button
          onClick={startStream}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <span>▶</span> Run AI Generation
        </button>
      )}

      {(isStreaming || streamingText) && (
        <div className="relative">
          {/* Status bar */}
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
            {isStreaming ? (
              <>
                <span className="pulse-dot w-2 h-2 bg-blue-400 rounded-full inline-block" />
                <span className="text-blue-300 font-semibold">Claude is generating...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
                <span className="text-green-300 font-semibold">Generation complete</span>
              </>
            )}
          </div>

          {/* Output box */}
          <div
            ref={containerRef}
            className="bg-slate-900/70 border border-slate-700 rounded-xl p-4 font-mono text-sm text-slate-200 max-h-80 overflow-y-auto whitespace-pre-wrap leading-relaxed"
          >
            {streamingText}
            {isStreaming && <span className="inline-block w-2 h-4 bg-blue-400 ml-0.5 animate-pulse" />}
          </div>

          {/* Regenerate button */}
          {!isStreaming && (
            <button
              onClick={startStream}
              className="mt-2 text-xs text-slate-400 hover:text-slate-200 underline transition-colors"
            >
              ↺ Re-run generation
            </button>
          )}
        </div>
      )}
    </div>
  );
}
