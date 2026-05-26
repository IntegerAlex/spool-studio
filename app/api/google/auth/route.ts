import { NextResponse } from "next/server";

import { generateGoogleAuthUrl } from "@/integrations/google/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const isValidUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  if (!isValidUuid(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const authUrl = generateGoogleAuthUrl(userId);
  return NextResponse.redirect(authUrl);
}
