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

  const body = await req.json();
  const { action, fileName, storagePath } = body;

  if (action === "presign") {
    if (!fileName) return NextResponse.json({ error: "fileName required" }, { status: 400 });
    const newStoragePath = `${project.id}/client/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    
    const { data: signedData, error: signError } = await sb.storage
      .from("project-files")
      .createSignedUploadUrl(newStoragePath);
      
    if (signError || !signedData) {
      return NextResponse.json({ error: "Failed to generate upload URL: " + signError?.message }, { status: 500 });
    }
    
    return NextResponse.json({ signedUrl: signedData.signedUrl, storagePath: newStoragePath });
  }

  if (action === "confirm") {
    if (!fileName || !storagePath) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    
    const { data: fileRecord, error: dbError } = await sb
      .from("portal_files")
      .insert({
        project_id: project.id,
        uploaded_by: "client",
        file_name: fileName,
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

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
