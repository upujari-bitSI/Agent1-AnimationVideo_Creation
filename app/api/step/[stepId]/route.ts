import { NextResponse } from "next/server";
import { stepOutputDb, sessionDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ stepId: string }> }
) {
  const { stepId } = await params;
  const url = new URL(_req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  const row = stepOutputDb.getByStep(sessionId, stepId);
  return NextResponse.json({ output: row || null });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ stepId: string }> }
) {
  try {
    const { stepId } = await params;
    const { sessionId, toolUsed, cost, output } = await req.json();
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const id = uuidv4();
    stepOutputDb.upsert({ id, session_id: sessionId, step_id: stepId, tool_used: toolUsed, cost: cost || 0, output: JSON.stringify(output) });
    sessionDb.update(sessionId, { status: "in_progress" });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ stepId: string }> }
) {
  try {
    const { stepId } = await params;
    const { sessionId, userEdits, approved } = await req.json();
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const existing = stepOutputDb.getByStep(sessionId, stepId);
    if (!existing) return NextResponse.json({ error: "step output not found" }, { status: 404 });

    stepOutputDb.upsert({
      ...existing,
      user_edits: userEdits || existing.user_edits,
      approved_at: approved ? Date.now() : (existing.approved_at ?? undefined),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
