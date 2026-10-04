import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { USER_ID } from "@/lib/domain/dashboard/dashboardService";
import { requestChatAdvice } from "@/lib/domain/ai/chatService";

const messageSchema = z.object({ content: z.string().min(1).max(4000) }).strict();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const { content } = messageSchema.parse(await request.json()); return NextResponse.json(await requestChatAdvice(USER_ID, id, content)); }
  catch (error) { const message = error instanceof Error ? error.message : "Unable to answer"; const noProvider = message === "No AI provider configured" || message === "OPENAI_API_KEY is not configured"; return NextResponse.json({ message: message === "Conversation not found" || noProvider ? message : error instanceof z.ZodError ? "Invalid input" : "Unable to answer" }, { status: message === "Conversation not found" ? 404 : noProvider ? 503 : error instanceof z.ZodError ? 400 : 503 }); }
}
