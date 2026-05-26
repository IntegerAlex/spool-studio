import "server-only";

import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { createGoogleOAuthClient } from "./auth";
import type { GoogleOAuthTokens } from "./types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics";
import type { Database } from "@/types/database";

type GoogleIntegrationRow = Database["public"]["Tables"]["google_integrations"]["Row"];

const EXPIRY_BUFFER_MS = 2 * 60 * 1000;

function isTokenExpired(expiryDate: number | null | undefined): boolean {
  if (!expiryDate) {
    return true;
  }

  return Date.now() >= expiryDate - EXPIRY_BUFFER_MS;
}

async function fetchGoogleEmail(oauth2Client: OAuth2Client, accessToken: string): Promise<string | null> {
  try {
    oauth2Client.setCredentials({ access_token: accessToken });
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    return data.email ?? null;
  } catch (error) {
    logProductionRuntimeError("google-oauth-email", error);
    return null;
  }
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleOAuthTokens> {
  const oauth2Client = createGoogleOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  return tokens as GoogleOAuthTokens;
}

export async function getGoogleTokens(userId: string): Promise<GoogleIntegrationRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("google_integrations")
    .select("id,user_id,google_email,access_token,refresh_token,expiry_date,created_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logProductionRuntimeError("google-integrations-get", error, { userId });
    return null;
  }

  return data ?? null;
}

export async function saveGoogleTokens(userId: string, tokens: GoogleOAuthTokens): Promise<void> {
  if (!tokens.access_token) {
    throw new Error("Google access token missing");
  }
  if (!tokens.expiry_date) {
    throw new Error("Google token expiry missing");
  }

  const existing = await getGoogleTokens(userId);
  const oauth2Client = createGoogleOAuthClient();
  const googleEmail = await fetchGoogleEmail(oauth2Client, tokens.access_token);
  const refreshToken = tokens.refresh_token ?? existing?.refresh_token ?? null;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("google_integrations")
    .upsert(
      {
        user_id: userId,
        google_email: googleEmail ?? existing?.google_email ?? null,
        access_token: tokens.access_token,
        refresh_token: refreshToken,
        expiry_date: tokens.expiry_date,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    logProductionRuntimeError("google-integrations-save", error, { userId });
    throw new Error("Failed to store Google tokens");
  }
}

export async function updateGoogleTokens(
  userId: string,
  tokens: Pick<GoogleOAuthTokens, "access_token" | "refresh_token" | "expiry_date">
): Promise<GoogleIntegrationRow> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("google_integrations")
    .update({
      access_token: tokens.access_token ?? undefined,
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    logProductionRuntimeError("google-integrations-update", error ?? new Error("Missing row"), { userId });
    throw new Error("Failed to update Google tokens");
  }

  return data;
}

export async function refreshGoogleTokensIfNeeded(
  integration: GoogleIntegrationRow
): Promise<GoogleOAuthTokens> {
  if (!integration.access_token) {
    throw new Error("Google access token missing");
  }

  if (!isTokenExpired(integration.expiry_date)) {
    return {
      access_token: integration.access_token,
      refresh_token: integration.refresh_token ?? undefined,
      expiry_date: integration.expiry_date,
    };
  }

  if (!integration.refresh_token) {
    throw new Error("Google refresh token missing");
  }

  const oauth2Client = createGoogleOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: integration.refresh_token,
  });

  const tokenResponse = await oauth2Client.refreshAccessToken();
  const credentials = tokenResponse.credentials;

  if (!credentials) {
    throw new Error("Google refresh credentials missing");
  }

  if (!credentials.access_token || !credentials.expiry_date) {
    throw new Error("Google token refresh failed");
  }

  const refreshed = await updateGoogleTokens(integration.user_id, {
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token ?? integration.refresh_token,
    expiry_date: credentials.expiry_date,
  });

  return {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token ?? undefined,
    expiry_date: refreshed.expiry_date,
  };
}

export async function getAuthenticatedGoogleClient(userId: string): Promise<OAuth2Client> {
  const integration = await getGoogleTokens(userId);
  if (!integration) {
    throw new Error("Google integration not connected");
  }

  const tokens = await refreshGoogleTokensIfNeeded(integration);
  if (!tokens.access_token) {
    throw new Error("Google access token missing");
  }

  const oauth2Client = createGoogleOAuthClient();
  const credentials = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? undefined,
    expiry_date: tokens.expiry_date,
  };

  oauth2Client.setCredentials(credentials);

  const accessTokenPresent = Boolean(oauth2Client.credentials?.access_token);
  if (!accessTokenPresent) {
    throw new Error("Google OAuth client missing access token");
  }

  return oauth2Client;
}
