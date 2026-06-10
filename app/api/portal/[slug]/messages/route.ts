import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const sb = getServiceClient();

  const { data: project } = await sb
    .from("projects")
    .select("id")
    .eq("portal_slug", params.slug)
    .single();

  if (!project) return NextResponse.json({ error: "Portal not found" }, { status: 404 });

  const { data: messages, error } = await sb
    .from("portal_messages")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const sb = getServiceClient();

  const { data: project } = await sb
    .from("projects")
    .select("id")
    .eq("portal_slug", params.slug)
    .single();

  if (!project) return NextResponse.json({ error: "Portal not found" }, { status: 404 });

  const { message } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const { data: newMessage, error } = await sb
    .from("portal_messages")
    .insert({
      project_id: project.id,
      actor: "client",
      message: message.trim(),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: newMessage }, { status: 201 });
}
