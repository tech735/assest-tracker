// CORS and JSON responses shared by the Edge Functions.
//
// Only the app's own origins may call the functions from a browser. Add more with the
// CORS_ORIGINS secret (comma-separated), e.g. a staging URL.
const ALLOWED = new Set(
  [
    "https://asset.kotu.co.in",
    "http://localhost:8080",
    ...(Deno.env.get("CORS_ORIGINS") || "").split(","),
  ].map((o) => o.trim()).filter(Boolean),
);
// Vercel preview deployments of this project.
const PREVIEW = /^https:\/\/[a-z0-9-]+-tech-kotus-projects\.vercel\.app$/;

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED.has(origin) || PREVIEW.test(origin);
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
}

/** An error whose message is safe to show the user. Anything else is logged and replaced. */
export class PublicError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function errorResponse(req: Request, fn: string, e: unknown): Response {
  if (e instanceof PublicError) return json(req, { error: e.message }, e.status);
  const ref = crypto.randomUUID().slice(0, 8);
  console.error(`${fn} failed [${ref}]:`, e instanceof Error ? e.message : String(e));
  return json(req, { error: `Something went wrong (ref ${ref}). Please try again or contact IT.` }, 500);
}
