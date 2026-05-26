import { NextResponse } from "next/server";

import { exchangeCodeForTokens, saveGoogleTokens } from "@/integrations/google/tokens";
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const isValidUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  if (!code) {
    return NextResponse.json({ error: "Missing OAuth code" }, { status: 400 });
  }

  if (!state) {
    return NextResponse.json({ error: "Missing OAuth state" }, { status: 400 });
  }

  if (!isValidUuid(state)) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }
  const userId = state;

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveGoogleTokens(userId, tokens);
  } catch (error) {
    logProductionRuntimeError("google-oauth-callback", error, { userId });
    return NextResponse.json({ error: "Google OAuth failed" }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/dashboard/settings", request.url));
}
