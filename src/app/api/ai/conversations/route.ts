import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { USER_ID } from "@/lib/domain/dashboard/dashboardService";
import * as conversations from "@/lib/domain/ai/conversationService";

const createSchema = z.object({}).strict();

export async function GET() { return NextResponse.json(await conversations.listConversations(USER_ID)); }

export async function POST(request: NextRequest) {
  try { createSchema.parse(await request.json()); return NextResponse.json(await conversations.createConversation(USER_ID), { status: 201 }); }
  catch (error) { return NextResponse.json({ message: error instanceof z.ZodError ? "Invalid input" : "Unable to create conversation" }, { status: error instanceof z.ZodError ? 400 : 503 }); }
}
