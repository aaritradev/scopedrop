import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

// POST /api/portal/[slug]/files — client uploads a file
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

  if (!project) {
    return NextResponse.json({ error: "Portal not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be under 25 MB" }, { status: 400 });
  }

  const storagePath = `${project.id}/client/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
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

  const { data: fileRecord, error: dbError } = await sb
    .from("portal_files")
    .insert({
      project_id: project.id,
      uploaded_by: "client",
      file_name: file.name,
      file_url: storagePath,
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
    actor: "client",
  });

  return NextResponse.json({ file: fileRecord }, { status: 201 });
}
