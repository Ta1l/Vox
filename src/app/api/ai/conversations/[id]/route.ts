import { NextResponse } from "next/server";
import { USER_ID } from "@/lib/domain/dashboard/dashboardService";
import { getMessages, requireConversation } from "@/lib/domain/ai/conversationService";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const conversation = await requireConversation(USER_ID, id); return NextResponse.json({ conversation, messages: await getMessages(USER_ID, id) }); }
  catch { return NextResponse.json({ message: "Conversation not found" }, { status: 404 }); }
}
