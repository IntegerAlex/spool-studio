import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error: lookupError } = await supabase
      .from("google_integrations")
      .select("id,google_email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (lookupError) {
      logProductionRuntimeError("google-integrations-status", lookupError, { userId: user.id });
      return NextResponse.json({ error: "Failed to load integration" }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        connected: Boolean(data),
        userId: user.id,
        googleEmail: data?.google_email ?? null,
      },
    });
  } catch (error) {
    logProductionRuntimeError("google-integrations-status", error);
    return NextResponse.json({ error: "Failed to load integration" }, { status: 500 });
  }
}
