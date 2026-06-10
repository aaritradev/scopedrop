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

  const body = await req.json();
  const { action, fileName, storagePath } = body;

  if (action === "presign") {
    if (!fileName) return NextResponse.json({ error: "fileName required" }, { status: 400 });
    const newStoragePath = `${project.id}/freelancer/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    
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
    
    // Get a signed URL (valid for 7 days — freelancer view only)
    const { data: signedDownload } = await sb.storage
      .from("project-files")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

    const { data: fileRecord, error: dbError } = await sb
      .from("portal_files")
      .insert({
        project_id: project.id,
        uploaded_by: "freelancer",
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
      actor: "freelancer",
    });

    return NextResponse.json({
      file: { ...fileRecord, signed_url: signedDownload?.signedUrl },
    }, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
