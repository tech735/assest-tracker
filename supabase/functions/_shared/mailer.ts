// Provider-agnostic mail service. Business logic (send-asset-email,
// amc-expiry-check) calls sendEmail() with recipients/subject/html only — it
// never talks to Resend directly, so the provider can be swapped later by
// editing only this file.

const DEFAULT_RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const MAIL_FROM = Deno.env.get("MAIL_FROM") || "Asset Compass <notifications@asset.kotu.co.in>";
// Replies to notifications reach IT instead of the unattended sending address.
const MAIL_REPLY_TO = Deno.env.get("MAIL_REPLY_TO") || "tech@kotu.co.in";

export interface SendEmailParams {
  to: string[];
  subject: string;
  html: string;
  // Optional override so individual functions can use their own Resend API
  // key (e.g. a key scoped to a different verified sending domain) instead
  // of the default RESEND_API_KEY secret.
  apiKey?: string;
  // Where replies go; defaults to MAIL_REPLY_TO (IT).
  replyTo?: string;
}

export interface SendEmailResult {
  mock: boolean;
  data?: unknown;
}

// Every Resend key configured on the project. A key can be revoked or limited to another sending
// domain; when Resend refuses one for that reason, the next is tried.
const ALL_KEYS = [DEFAULT_RESEND_API_KEY, Deno.env.get("RESEND_API_KEY_ASSET_SUMMARY"), Deno.env.get("RESEND_API_KEY_AMC")];

export async function sendEmail({ to, subject, html, apiKey, replyTo }: SendEmailParams): Promise<SendEmailResult> {
  const keys = [...new Set([apiKey, ...ALL_KEYS].filter((k): k is string => !!k && k.trim().length > 0))];

  if (!keys.length) {
    console.log(`Mocking email send to [${to.join(", ")}] (No RESEND_API_KEY found):`, html);
    return { mock: true };
  }

  let lastError = "";
  for (const key of keys) {
    try {
      return await sendWithKey(key, { to, subject, html, replyTo });
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error(`Resend rejected a key: ${lastError}`);
      // Only an auth / domain problem is worth retrying with another key.
      if (!/401|403|api key|domain|not verified|restricted/i.test(lastError)) break;
    }
  }
  throw new Error(lastError || "Email could not be sent");
}

async function sendWithKey(resendApiKey: string, { to, subject, html, replyTo }: { to: string[]; subject: string; html: string; replyTo?: string }): Promise<SendEmailResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to,
      reply_to: replyTo || MAIL_REPLY_TO,
      subject,
      html,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${data?.message || JSON.stringify(data)}`);
  }

  return { mock: false, data };
}
