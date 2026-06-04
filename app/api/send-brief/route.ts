import { NextRequest, NextResponse } from "next/server";
import { verifySession, getTokenFromRequest } from "@/lib/auth";
import { Resend } from "resend";
import { getServiceClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

const resendApiKey = process.env.RESEND_API_KEY;

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userLimit = checkRateLimit(session.sub, { key: "send-brief:user", limit: 20, windowMs: 60 * 60 * 1000 });
  if (userLimit.limited) {
    return rateLimitResponse(userLimit.retryAfter);
  }

  const ipLimit = checkRateLimit(getClientIp(req), { key: "send-brief:ip", limit: 60, windowMs: 60 * 60 * 1000 });
  if (ipLimit.limited) {
    return rateLimitResponse(ipLimit.retryAfter);
  }

  if (!resendApiKey) {
    return NextResponse.json({ error: "Email sending is not configured yet." }, { status: 503 });
  }

  const { briefId, toEmail } = await req.json();

  if (!briefId || typeof briefId !== "string") {
    return NextResponse.json({ error: "briefId is required" }, { status: 400 });
  }

  if (!toEmail || typeof toEmail !== "string") {
    return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
  }

  const sb = getServiceClient();

  const { data: user } = await sb
    .from("users")
    .select("id")
    .eq("provider_user_id", session.sub)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: brief } = await sb
    .from("briefs")
    .select("id, title, client_name, share_token")
    .eq("id", briefId)
    .eq("user_id", user.id)
    .single();

  if (!brief) {
    return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const shareUrl = `${appUrl.replace(/\/$/, "")}/brief/${brief.share_token}`;

  const resend = new Resend(resendApiKey);

  try {
    await resend.emails.send({
      from: "ScopeDrop <onboarding@resend.dev>",
      to: [toEmail],
      subject: `Project brief: ${brief.title}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111827">
          <p>Hi ${brief.client_name || "there"},</p>
          <p>Your project brief is ready.</p>
          <p>
            <a href="${shareUrl}" style="display:inline-block;padding:10px 16px;background:#ff9500;color:#4b2800;text-decoration:none;border-radius:10px;font-weight:600;">
              View Brief
            </a>
          </p>
          <p>If the button does not work, use this link:<br /><a href="${shareUrl}">${shareUrl}</a></p>
          <p>Sent via ScopeDrop</p>
        </div>
      `,
      text: `Hi ${brief.client_name || "there"},\n\nYour project brief is ready: ${shareUrl}\n\nSent via ScopeDrop`,
    });

    await sb
      .from("briefs")
      .update({ status: "sent" })
      .eq("id", briefId)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, shareUrl });
  } catch (error) {
    console.error("Send brief email error:", error);
    return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 });
  }
}
