import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// POST /api/portal/[slug]/approve — client approves the scope
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const sb = getServiceClient();

  const { data: project } = await sb
    .from("projects")
    .select("id, status")
    .eq("portal_slug", params.slug)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Portal not found" }, { status: 404 });
  }

  // Check if already approved
  const { data: existing } = await sb
    .from("portal_activity")
    .select("id")
    .eq("project_id", project.id)
    .eq("event", "scope_approved")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: "Already approved" });
  }

  await sb.from("portal_activity").insert({
    project_id: project.id,
    event: "scope_approved",
    actor: "client",
  });

  // Move status to in_progress if it was not_started
  if (project.status === "not_started") {
    await sb.from("projects").update({ status: "in_progress" }).eq("id", project.id);
  }

  return NextResponse.json({ success: true });
}
