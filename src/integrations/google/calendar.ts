import "server-only";

import { google } from "googleapis";
import { createGoogleOAuthClient } from "./auth";
import type { GoogleOAuthTokens } from "./types";

export function createGoogleCalendarClient(tokens: GoogleOAuthTokens) {
  const oauth2Client = createGoogleOAuthClient();
  oauth2Client.setCredentials(tokens);

  return google.calendar({ version: "v3", auth: oauth2Client });
}
