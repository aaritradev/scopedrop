import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifySession, getTokenFromRequest } from "@/lib/auth";

// POST /api/projects/[id]/invoice — create an invoice
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getTokenFromRequest(req);
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getServiceClient();

  const { data: user } = await sb
    .from("users")
    .select("id")
    .eq("provider_user_id", session.sub)
    .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: project } = await sb
    .from("projects")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = await req.json();
  const { amount, payment_method, payment_details, currency } = body as {
    amount: number;
    payment_method: "upi" | "bank";
    payment_details: string;
    currency?: string;
  };

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
  }
  if (!payment_details?.trim()) {
    return NextResponse.json({ error: "Payment details are required" }, { status: 400 });
  }

  // Delete existing unpaid invoices (only one active invoice per project)
  await sb.from("invoices").delete().eq("project_id", project.id).eq("status", "unpaid");

  const { data: invoice, error } = await sb
    .from("invoices")
    .insert({
      project_id: project.id,
      amount: Math.round(amount), // in paise
      currency: currency ?? "INR",
      status: "unpaid",
      payment_method: payment_method ?? "upi",
      payment_details: payment_details.trim(),
    })
    .select()
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }

  return NextResponse.json({ invoice }, { status: 201 });
}

// PATCH /api/projects/[id]/invoice — mark invoice as paid (freelancer side)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getTokenFromRequest(req);
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getServiceClient();

  const { data: user } = await sb
    .from("users")
    .select("id")
    .eq("provider_user_id", session.sub)
    .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: project } = await sb
    .from("projects")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

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

  // Update project status to paid
  await sb.from("projects").update({ status: "paid" }).eq("id", project.id);

  return NextResponse.json({ invoice });
}
