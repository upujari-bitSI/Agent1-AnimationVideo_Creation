import { NextResponse } from "next/server";

// Proxy endpoint for tool API calls (music gen, image gen, etc.)
export async function POST(req: Request) {
  const { tool, action, payload } = await req.json();

  switch (tool) {
    case "suno":
      return handleSuno(action, payload);
    case "openai-image":
      return handleOpenAIImage(action, payload);
    case "stability":
      return handleStability(action, payload);
    default:
      return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
  }
}

async function handleSuno(action: string, payload: Record<string, unknown>) {
  if (!process.env.SUNO_API_KEY) {
    return NextResponse.json({ manual: true, message: "Suno API key not configured. Use Suno manually." });
  }
  // Suno API integration placeholder — replace with actual Suno API endpoint
  return NextResponse.json({ error: "Suno API not yet integrated", action, payload }, { status: 501 });
}

async function handleOpenAIImage(action: string, payload: Record<string, unknown>) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 400 });
  }
  if (action === "generate") {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "dall-e-3", prompt: payload.prompt, n: 1, size: "1024x1024" }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function handleStability(action: string, payload: Record<string, unknown>) {
  if (!process.env.STABILITY_API_KEY) {
    return NextResponse.json({ error: "STABILITY_API_KEY not configured" }, { status: 400 });
  }
  if (action === "generate") {
    const res = await fetch("https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
      },
      body: JSON.stringify({ text_prompts: [{ text: payload.prompt }], cfg_scale: 7, steps: 30, samples: 1 }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
