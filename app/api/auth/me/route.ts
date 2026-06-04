import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { FREE_MONTHLY_CREDITS } from "@/lib/billing";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const sb = getServiceClient();

  let { data: user } = await sb
    .from("users")
    .select("id, email, name, avatar_url, plan, credits_remaining")
    .eq("provider_user_id", session.sub)
    .single();

  if (!user) {
    const { data: inserted } = await sb
      .from("users")
      .insert({
        provider_user_id: session.sub,
        email: session.email,
        name: session.name,
        avatar_url: session.picture || null,
        credits_remaining: FREE_MONTHLY_CREDITS,
        plan: "free",
      })
      .select("id, email, name, avatar_url, plan, credits_remaining")
      .single();
    user = inserted;
  }

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.avatar_url,
      plan: user.plan,
      credits_remaining: user.credits_remaining,
    },
  });
}
