// Caller checks and throttling for the Edge Functions.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PublicError } from "./http.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Service-role client: only for the email log and permission lookups, never for user data. */
const admin = (): SupabaseClient => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export interface Caller {
  id: string;
  email: string;
  role: string;
  /** A client acting as the caller, so row-level security applies to everything it reads. */
  db: SupabaseClient;
  can: (permission: string) => boolean;
}

/** Verifies the bearer token and loads the caller's role and permissions. */
export async function requireCaller(req: Request): Promise<Caller> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) throw new PublicError("Not signed in", 401);
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data } = await db.auth.getUser(token);
  if (!data?.user) throw new PublicError("Not signed in", 401);

  const sb = admin();
  const { data: profile } = await sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  const role = (profile?.role as string) || "VIEWER";
  const { data: perms } = await sb.from("role_permissions").select("permission").eq("role", role);
  const granted = new Set((perms || []).map((p: { permission: string }) => p.permission));
  return { id: data.user.id, email: data.user.email || "", role, db, can: (p) => role === "ADMIN" || granted.has(p) };
}

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Scheduled jobs: the x-cron-secret header matches CRON_SECRET, or the service-role key is used. */
export function isScheduler(req: Request): boolean {
  const secret = Deno.env.get("CRON_SECRET") || "";
  return safeEqual(req.headers.get("x-cron-secret") || "", secret) || isServiceRole(req);
}

/** True when the request carries the project's service-role JWT. */
export function isServiceRole(req: Request): boolean {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (token && token === SUPABASE_SERVICE_ROLE_KEY) return true;
  try {
    // The gateway (verify_jwt) has already checked the signature; read the role claim.
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

/**
 * Refuses (PublicError 429) when `fn` already emailed `target` within `minutes` (0 = ever).
 * Call recordEmail() after a successful send.
 */
export async function checkThrottle(fn: string, target: string, minutes: number) {
  let q = admin().from("email_log").select("id", { count: "exact", head: true }).eq("fn", fn).eq("target", target);
  if (minutes > 0) q = q.gte("created_at", new Date(Date.now() - minutes * 60_000).toISOString());
  const { count, error } = await q;
  if (error) throw error;
  if ((count || 0) > 0) {
    throw new PublicError(minutes > 0 ? `Already emailed in the last ${minutes} minutes — please wait before sending again.` : "IT has already been notified about this.", 429);
  }
}

export async function recordEmail(fn: string, target: string, sentBy?: string) {
  const { error } = await admin().from("email_log").insert({ fn, target, sent_by: sentBy || null });
  if (error) console.error(`email_log insert failed for ${fn}:`, error.message);
}
