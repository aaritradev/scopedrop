import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { FREE_MONTHLY_CREDITS } from "@/lib/billing";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();

  const { data: user } = await sb
    .from("users")
    .select("plan, credits_remaining")
    .eq("provider_user_id", session.sub)
    .single();

  if (!user) {
    const { data: inserted } = await sb
      .from("users")
      .insert({ provider_user_id: session.sub, credits_remaining: FREE_MONTHLY_CREDITS, plan: "free" })
      .select("plan, credits_remaining")
      .single();

    return NextResponse.json({ user: inserted ?? { plan: "free", credits_remaining: FREE_MONTHLY_CREDITS } });
  }

  return NextResponse.json({ user });
}
