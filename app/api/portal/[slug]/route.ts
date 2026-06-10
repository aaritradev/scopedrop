import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// GET /api/portal/[slug] — PUBLIC, no auth
// Returns all portal data needed for the client page
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const sb = getServiceClient();

  const { data: project } = await sb
    .from("projects")
    .select(`
      id,
      client_name,
      client_email,
      status,
      portal_slug,
      created_at,
      briefs ( id, title, client_name, generated_brief ),
      portal_files ( id, uploaded_by, file_name, file_url, created_at ),
      invoices ( id, amount, currency, status, payment_method, payment_details, paid_at, created_at ),
      portal_activity ( id, event, actor, created_at ),
      users ( name )
    `)
    .eq("portal_slug", params.slug)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Portal not found" }, { status: 404 });
  }

  // Generate signed URLs for all files (1 hour expiry for clients)
  const files = (project.portal_files ?? []) as {
    id: string;
    uploaded_by: string;
    file_name: string;
    file_url: string;
    created_at: string;
  }[];

  const filesWithUrls = await Promise.all(
    files.map(async (f) => {
      const { data } = await sb.storage
        .from("project-files")
        .createSignedUrl(f.file_url, 60 * 60); // 1 hour
      return { ...f, signed_url: data?.signedUrl ?? null };
    })
  );

  // Log scope_viewed activity (fire and forget)
  Promise.resolve(
    sb.from("portal_activity").insert({
      project_id: project.id,
      event: "scope_viewed",
      actor: "client",
    })
  ).catch(() => {});

  const users = project.users as any;
  const freelancerName = (Array.isArray(users) ? users[0]?.name : users?.name) ?? "Your freelancer";

  return NextResponse.json({
    project: {
      ...project,
      portal_files: filesWithUrls,
      freelancer_name: freelancerName,
      users: undefined, // strip sensitive user data
    },
  });
}
