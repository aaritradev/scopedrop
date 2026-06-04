import { NextRequest, NextResponse } from "next/server";
import { verifySession, getTokenFromRequest } from "@/lib/auth";
import { canUseFeature } from "@/lib/billing";
import { exportBriefPDF } from "@/lib/exportPDF";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { getServiceClient } from "@/lib/supabase";

function safeFileName(value: string): string {
  return (value || "brief").replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "brief";
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = getTokenFromRequest(req);
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userLimit = checkRateLimit(session.sub, { key: "export-pdf:user", limit: 30, windowMs: 60 * 60 * 1000 });
  if (userLimit.limited) {
    return rateLimitResponse(userLimit.retryAfter);
  }

  const ipLimit = checkRateLimit(getClientIp(req), { key: "export-pdf:ip", limit: 90, windowMs: 60 * 60 * 1000 });
  if (ipLimit.limited) {
    return rateLimitResponse(ipLimit.retryAfter);
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

  if (!canUseFeature(user.plan, "pdfExport")) {
    return NextResponse.json({ error: "PDF export is included in Starter." }, { status: 403 });
  }

  const { data: brief } = await sb
    .from("briefs")
    .select("title, generated_brief")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!brief) {
    return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  const doc = exportBriefPDF(brief.generated_brief);
  const pdf = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFileName(brief.title)}.pdf"`,
    },
  });
}
