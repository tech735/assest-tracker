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
}

export interface SendEmailResult {
  mock: boolean;
  data?: unknown;
}

export async function sendEmail({ to, subject, html, apiKey }: SendEmailParams): Promise<SendEmailResult> {
  const resendApiKey = apiKey || DEFAULT_RESEND_API_KEY;

  if (!resendApiKey) {
    console.log(`Mocking email send to [${to.join(", ")}] (No RESEND_API_KEY found):`, html);
    return { mock: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to,
      reply_to: MAIL_REPLY_TO,
      subject,
      html,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Resend API Error: ${JSON.stringify(data)}`);
  }

  return { mock: false, data };
}
