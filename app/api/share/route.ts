import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const ipLimit = checkRateLimit(getClientIp(req), { key: "share:ip", limit: 120, windowMs: 60 * 1000 });
  if (ipLimit.limited) {
    return rateLimitResponse(ipLimit.retryAfter);
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const sb = getServiceClient();
  const { data: brief } = await sb
    .from("briefs")
    .select("title, client_name, generated_brief, status, created_at")
    .eq("share_token", token)
    .single();

  if (!brief) {
    return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  return NextResponse.json({ brief });
}
