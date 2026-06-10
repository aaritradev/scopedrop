import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifySession, getTokenFromRequest } from "@/lib/auth";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

// POST /api/projects/[id]/files — freelancer uploads a file
export async function POST(
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

  // Verify project belongs to user
  const { data: project } = await sb
    .from("projects")
    .select("id, portal_slug")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be under 25 MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const storagePath = `${project.id}/freelancer/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await sb.storage
    .from("project-files")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 500 });
  }

  // Get a signed URL (valid for 7 days — freelancer view only)
  const { data: signedData } = await sb.storage
    .from("project-files")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  const { data: fileRecord, error: dbError } = await sb
    .from("portal_files")
    .insert({
      project_id: project.id,
      uploaded_by: "freelancer",
      file_name: file.name,
      file_url: storagePath, // store path, generate signed URL on demand
    })
    .select("id, file_name, file_url, uploaded_by, created_at")
    .single();

  if (dbError) {
    return NextResponse.json({ error: "Failed to save file record" }, { status: 500 });
  }

  // Log activity
  await sb.from("portal_activity").insert({
    project_id: project.id,
    event: "file_uploaded",
    actor: "freelancer",
  });

  return NextResponse.json({
    file: { ...fileRecord, signed_url: signedData?.signedUrl },
  }, { status: 201 });
}
