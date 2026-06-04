import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifySession, getTokenFromRequest } from "@/lib/auth";

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = getTokenFromRequest(req);
  const session = token ? await verifySession(token) : null;
  if (!session) return null;

  const sb = getServiceClient();
  const { data: user } = await sb
    .from("users")
    .select("id")
    .eq("provider_user_id", session.sub)
    .single();
  return user?.id ?? null;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();
  const { data: brief } = await sb
    .from("briefs")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", userId)
    .single();

  if (!brief) {
    return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  return NextResponse.json({ brief });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.title) updates.title = body.title;
  if (body.client_name) updates.client_name = body.client_name;
  if (body.status) updates.status = body.status;
  if (body.generated_brief) updates.generated_brief = body.generated_brief;
  if (body.raw_input) updates.raw_input = body.raw_input;

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("briefs")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ brief: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();
  const { error } = await sb
    .from("briefs")
    .delete()
    .eq("id", params.id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
