import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifySession, getTokenFromRequest } from "@/lib/auth";

// GET /api/projects/[id] — full project detail for the freelancer
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getTokenFromRequest(req);
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();

  const { data: user } = await sb
    .from("users")
    .select("id, name")
    .eq("provider_user_id", session.sub)
    .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: project } = await sb
    .from("projects")
    .select(`
      id,
      client_name,
      client_email,
      status,
      portal_slug,
      created_at,
      scope_id,
      briefs ( id, title, client_name, generated_brief ),
      portal_files ( id, uploaded_by, file_name, file_url, created_at ),
      invoices ( id, amount, currency, status, payment_method, payment_details, paid_at, created_at ),
      portal_activity ( id, event, actor, created_at )
    `)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

// PATCH /api/projects/[id] — update project status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getTokenFromRequest(req);
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();

  const { data: user } = await sb
    .from("users")
    .select("id")
    .eq("provider_user_id", session.sub)
    .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const validStatuses = ["not_started", "in_progress", "in_review", "delivered", "paid"];

  if (body.status && !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: project, error } = await sb
    .from("projects")
    .update({ status: body.status })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id, status")
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }

  return NextResponse.json({ project });
}

// DELETE /api/projects/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getTokenFromRequest(req);
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();

  const { data: user } = await sb
    .from("users")
    .select("id")
    .eq("provider_user_id", session.sub)
    .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { error } = await sb
    .from("projects")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
