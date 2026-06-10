import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifySession, getTokenFromRequest } from "@/lib/auth";
import { canUseFeature, canCreateProject } from "@/lib/billing";

function generateSlug(length = 10): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// GET /api/projects — list all projects for the authenticated user
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();

  const { data: user } = await sb
    .from("users")
    .select("id, plan")
    .eq("provider_user_id", session.sub)
    .single();

  if (!user) {
    return NextResponse.json({ projects: [] });
  }

  const { data: projects } = await sb
    .from("projects")
    .select(`
      id,
      client_name,
      client_email,
      status,
      portal_slug,
      created_at,
      scope_id,
      briefs ( title ),
      invoices ( id, amount, currency, status ),
      portal_activity ( id, event, created_at )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Quick stats
  const activeStatuses = ["not_started", "in_progress", "in_review", "delivered"];
  const activeProjects = (projects ?? []).filter((p) =>
    activeStatuses.includes(p.status)
  ).length;

  const pendingApprovals = (projects ?? []).filter((p) => {
    const activity = (p.portal_activity ?? []) as { event: string }[];
    const hasApproval = activity.some((a) => a.event === "scope_approved");
    return !hasApproval && activeStatuses.includes(p.status);
  }).length;

  const unpaidTotal = (projects ?? []).reduce((sum, p) => {
    const unpaid = (p.invoices ?? []) as { status: string; amount: number }[];
    return sum + unpaid
      .filter((inv) => inv.status === "unpaid")
      .reduce((s, inv) => s + inv.amount, 0);
  }, 0);

  return NextResponse.json({
    projects: projects ?? [],
    stats: {
      activeProjects,
      pendingApprovals,
      unpaidTotalPaise: unpaidTotal,
    },
  });
}

// POST /api/projects — create a new project
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();

  const { data: user } = await sb
    .from("users")
    .select("id, plan")
    .eq("provider_user_id", session.sub)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check plan access
  if (!canUseFeature(user.plan, "clientPortal")) {
    return NextResponse.json(
      { error: "Upgrade to Starter to create a client portal." },
      { status: 403 }
    );
  }

  // Check active project count vs plan limit
  const { count: projectCount } = await sb
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["not_started", "in_progress", "in_review", "delivered"]);

  if (!canCreateProject(user.plan, projectCount ?? 0)) {
    return NextResponse.json(
      { error: "You've reached the active project limit for your plan. Upgrade to Pro for unlimited projects." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { client_name, client_email, scope_id } = body as {
    client_name: string;
    client_email?: string;
    scope_id?: string;
  };

  if (!client_name?.trim()) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }

  // Generate a unique slug
  let portal_slug = generateSlug();
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await sb
      .from("projects")
      .select("id")
      .eq("portal_slug", portal_slug)
      .maybeSingle();
    if (!existing) break;
    portal_slug = generateSlug();
    attempts++;
  }

  const { data: project, error } = await sb
    .from("projects")
    .insert({
      user_id: user.id,
      client_name: client_name.trim(),
      client_email: client_email?.trim() ?? "",
      scope_id: scope_id || null,
      portal_slug,
      status: "not_started",
    })
    .select("id, portal_slug")
    .single();

  if (error || !project) {
    console.error("Project creation error:", error);
    return NextResponse.json({ error: "Failed to create project", details: error }, { status: 500 });
  }

  // Log activity
  await sb.from("portal_activity").insert({
    project_id: project.id,
    event: "portal_created",
    actor: "freelancer",
  });

  return NextResponse.json({ project }, { status: 201 });
}
