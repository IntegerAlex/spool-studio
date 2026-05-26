type RuntimeLogContext = Record<string, unknown>;

const envCheckState = globalThis as typeof globalThis & {
  __cmsEnvChecks?: { supabase: boolean; google: boolean; mailgun: boolean };
};
// Persist across module reloads in dev to avoid repeated env-check logs.
const envChecks = envCheckState.__cmsEnvChecks ?? {
  supabase: false,
  google: false,
  mailgun: false,
};
envCheckState.__cmsEnvChecks = envChecks;

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
  if (envChecks.supabase) {
    return;
  }

  envChecks.supabase = true;
  logEnvironmentCheck('[env-check]', {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function logGoogleEnvCheck(): void {
  if (envChecks.google) {
    return;
  }

  envChecks.google = true;
  logEnvironmentCheck('[env-check]', {
    googleEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    googleKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  });
}

export function logMailgunEnvCheck(): void {
  if (envChecks.mailgun) {
    return;
  }

  envChecks.mailgun = true;
  logEnvironmentCheck('[env-check]', {
    mailgunApiKey: !!process.env.MAILGUN_API_KEY,
    mailgunDomain: !!process.env.MAILGUN_DOMAIN,
    mailgunFrom: !!process.env.MAILGUN_FROM,
    mailgunTo: !!process.env.MAIL_NOTIFICATION_TO,
  });
}
