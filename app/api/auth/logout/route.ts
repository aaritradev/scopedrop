import { NextResponse } from "next/server";
import { makeClearCookieValue } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.append("Set-Cookie", makeClearCookieValue());
  return response;
}
