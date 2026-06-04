import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifySession, getTokenFromRequest } from "@/lib/auth";
import { canUseFeature, getBriefHistoryLimit } from "@/lib/billing";

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
    return NextResponse.json({ briefs: [] });
  }

  const historyLimit = getBriefHistoryLimit(user.plan);
  const hasFullHistory = canUseFeature(user.plan, "fullBriefHistory");
  let query = sb
    .from("briefs")
    .select("id, title, client_name, status, created_at, share_token", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (historyLimit !== null) {
    query = query.limit(historyLimit);
  }

  const { data: briefs, count } = await query;

  return NextResponse.json({
    briefs: briefs ?? [],
    history: {
      fullAccess: hasFullHistory,
      limit: historyLimit,
      total: count ?? briefs?.length ?? 0,
    },
  });
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: "Manual brief creation is disabled. Use /api/generate." },
    { status: 405 },
  );
}
