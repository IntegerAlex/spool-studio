type RuntimeLogContext = Record<string, unknown>;

let supabaseEnvLogged = false;
let googleEnvLogged = false;
let mailgunEnvLogged = false;

function logEnvironmentCheck(prefix: string, payload: RuntimeLogContext): void {
  console.info(prefix, payload);
}

export function logProductionRuntimeError(source: string, error: unknown, extra: RuntimeLogContext = {}): void {
  console.error('[production-runtime]', {
    source,
    message: error instanceof Error ? error.message : 'unknown',
    ...extra,
  });
}

export function logSupabaseEnvCheck(): void {
  if (supabaseEnvLogged) {
    return;
  }

  supabaseEnvLogged = true;
  logEnvironmentCheck('[env-check]', {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function logGoogleEnvCheck(): void {
  if (googleEnvLogged) {
    return;
  }

  googleEnvLogged = true;
  logEnvironmentCheck('[env-check]', {
    googleEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    googleKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  });
}

export function logMailgunEnvCheck(): void {
  if (mailgunEnvLogged) {
    return;
  }

  mailgunEnvLogged = true;
  logEnvironmentCheck('[env-check]', {
    mailgunApiKey: !!process.env.MAILGUN_API_KEY,
    mailgunDomain: !!process.env.MAILGUN_DOMAIN,
    mailgunFrom: !!process.env.MAILGUN_FROM,
    mailgunTo: !!process.env.MAIL_NOTIFICATION_TO,
  });
}
