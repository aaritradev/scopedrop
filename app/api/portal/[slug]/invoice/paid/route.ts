import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// POST /api/portal/[slug]/invoice/paid — client marks invoice as paid
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

  const body = await req.json();
  const { invoice_id } = body as { invoice_id: string };

  const { data: invoice, error } = await sb
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", invoice_id)
    .eq("project_id", project.id)
    .select()
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }

  await sb.from("portal_activity").insert({
    project_id: project.id,
    event: "invoice_paid",
    actor: "client",
  });

  // Update project status
  await sb.from("projects").update({ status: "paid" }).eq("id", project.id);

  return NextResponse.json({ invoice });
}
