import { NextRequest, NextResponse } from "next/server";
import { generateBrief } from "@/lib/generateBrief";
import { getServiceClient } from "@/lib/supabase";
import { verifySession, getTokenFromRequest } from "@/lib/auth";
import { FREE_MONTHLY_CREDITS } from "@/lib/billing";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import {
  generateSaveAndConsumeCredit,
  protectedGenerationErrorPayload,
} from "@/lib/generationProtection";

export async function POST(req: NextRequest) {
  try {
    const { rawInput } = await req.json();

    if (!rawInput || typeof rawInput !== "string") {
      return NextResponse.json({ error: "rawInput is required" }, { status: 400 });
    }

    if (rawInput.length < 20) {
      return NextResponse.json(
        { error: "That message was too short. Add more details." },
        { status: 400 },
      );
    }

    const token = getTokenFromRequest(req);
    const session = token ? await verifySession(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userLimit = checkRateLimit(session.sub, { key: "generate:user", limit: 10, windowMs: 10 * 60 * 1000 });
    if (userLimit.limited) {
      return rateLimitResponse(userLimit.retryAfter);
    }

    const ipLimit = checkRateLimit(getClientIp(req), { key: "generate:ip", limit: 30, windowMs: 10 * 60 * 1000 });
    if (ipLimit.limited) {
      return rateLimitResponse(ipLimit.retryAfter);
    }

    const sb = getServiceClient();
    let dbUserId: string | null = null;

    const { data: user } = await sb
      .from("users")
      .select("id, credits_remaining")
      .eq("provider_user_id", session.sub)
      .single();

    if (!user) {
      const { data: newUser, error: userInsertError } = await sb
        .from("users")
        .insert({ provider_user_id: session.sub, credits_remaining: FREE_MONTHLY_CREDITS, plan: "free" })
        .select("id")
        .single();

      if (userInsertError || !newUser?.id) {
        throw new Error("GENERATION_FAILED");
      }

      dbUserId = newUser?.id ?? null;
    } else {
      if (user.credits_remaining <= 0) {
        return NextResponse.json(
          { error: "No credits remaining. Upgrade to Starter to generate more briefs." },
          { status: 403 },
        );
      }
      dbUserId = user.id;
    }

    if (!dbUserId) {
      throw new Error("GENERATION_FAILED");
    }

    const result = await generateSaveAndConsumeCredit({
      rawInput,
      dbUserId,
      generateBrief,
      sb,
      createShareToken: () => crypto.randomUUID(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate error:", error);

    const protectedPayload = protectedGenerationErrorPayload(error);
    if (protectedPayload) {
      return NextResponse.json(protectedPayload.body, { status: protectedPayload.status });
    }

    const code = error instanceof Error ? error.message : "UNKNOWN";

    if (code === "CONFIG_MISSING_API_KEY" || code === "CONFIG_INVALID_API_KEY") {
      return NextResponse.json(
        {
          error:
            "Brief generation is not configured yet. Please contact support or add a valid API key in project settings.",
        },
        { status: 503 },
      );
    }

    if (code === "PROVIDER_RATE_LIMIT") {
      return NextResponse.json(
        {
          error:
            "We are receiving too many requests right now. Please wait a moment and try again.",
        },
        { status: 429 },
      );
    }

    if (code === "PROVIDER_UNAVAILABLE") {
      return NextResponse.json(
        {
          error:
            "The AI service is temporarily unavailable. Please try again in a few minutes.",
        },
        { status: 503 },
      );
    }

    if (code === "PROVIDER_INVALID_RESPONSE" || code === "PROVIDER_REQUEST_FAILED") {
      return NextResponse.json(
        {
          error:
            "We could not generate a valid brief from that request. Please retry or add a bit more project detail.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Something went wrong while generating your brief. Please try again." },
      { status: 500 },
    );
  }
}
