export const PROTECTED_GENERATION_FAILURE_MESSAGE =
  "AI provider is temporarily unavailable.\n\nNo credits were used.\n\nPlease try again in a few minutes.";

const PROTECTED_FAILURE_CODES = new Set([
  "CONFIG_MISSING_API_KEY",
  "CONFIG_INVALID_API_KEY",
  "PROVIDER_RATE_LIMIT",
  "PROVIDER_TIMEOUT",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_INVALID_RESPONSE",
  "PROVIDER_REQUEST_FAILED",
  "GENERATION_FAILED",
  "REPORT_VALIDATION_FAILED",
  "REPORT_SAVE_FAILED",
  "CREDIT_DEDUCTION_FAILED",
]);

function errorCode(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "UNKNOWN";
}

export function isProtectedGenerationFailure(error) {
  const code = errorCode(error);
  return (
    PROTECTED_FAILURE_CODES.has(code) ||
    code.startsWith("PROVIDER_") ||
    code.startsWith("REPORT_")
  );
}

export function protectedGenerationErrorPayload(error) {
  if (!isProtectedGenerationFailure(error)) return null;

  return {
    status: 503,
    body: { error: PROTECTED_GENERATION_FAILURE_MESSAGE },
  };
}

export function validateGeneratedReport(brief) {
  if (!brief || typeof brief !== "object") {
    return { valid: false, reason: "Brief is missing" };
  }

  const hasText = (value) => typeof value === "string" && value.trim().length > 0;
  const hasArray = (value) => Array.isArray(value) && value.length > 0;

  if (!hasText(brief.projectTitle)) {
    return { valid: false, reason: "Missing project title" };
  }

  if (!hasText(brief.projectSummary) && !hasText(brief.executiveSummary)) {
    return { valid: false, reason: "Missing report summary" };
  }

  if (!hasArray(brief.objectives) || !hasArray(brief.scopeIncluded) || !hasArray(brief.deliverables)) {
    return { valid: false, reason: "Missing core report sections" };
  }

  if (!brief.paymentTerms || typeof brief.paymentTerms !== "object") {
    return { valid: false, reason: "Missing payment terms" };
  }

  return { valid: true };
}

export async function generateSaveAndConsumeCredit({
  rawInput,
  dbUserId,
  generateBrief,
  sb,
  createShareToken,
}) {
  const brief = await generateBrief(rawInput);
  const validation = validateGeneratedReport(brief);

  if (!validation.valid) {
    throw new Error("REPORT_VALIDATION_FAILED");
  }

  const shareToken = createShareToken();
  const { data: inserted, error: insertError } = await sb
    .from("briefs")
    .insert({
      user_id: dbUserId,
      raw_input: rawInput,
      generated_brief: brief,
      title: brief.projectTitle,
      client_name: brief.clientName,
      status: "draft",
      share_token: shareToken,
    })
    .select("id, share_token")
    .single();

  if (insertError || !inserted?.id || !inserted?.share_token) {
    throw new Error("REPORT_SAVE_FAILED");
  }

  const { error: creditError } = await sb.rpc("decrement_credit", { user_id_param: dbUserId });

  if (creditError) {
    await sb
      .from("briefs")
      .delete()
      .eq("id", inserted.id)
      .eq("user_id", dbUserId);

    throw new Error("CREDIT_DEDUCTION_FAILED");
  }

  return {
    brief,
    shareToken: inserted.share_token,
    briefId: inserted.id,
  };
}
