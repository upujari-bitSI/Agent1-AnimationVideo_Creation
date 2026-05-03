import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { prompt, sessionId, stepId, system } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
        const params: Anthropic.MessageCreateParamsStreaming = {
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          stream: true,
          messages,
        };
        if (system) params.system = system;

        const response = await client.messages.create(params);

        for await (const chunk of response) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            const data = JSON.stringify({ text: chunk.delta.text, sessionId, stepId });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          if (chunk.type === "message_stop") {
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
