// Emails an employee the link to sign their handover/return form.
//
// Security: the document is loaded with the CALLER's JWT (not the service role), so row-level
// security decides whether they may see it — only IT staff and the employee themselves can.
// Deploy: supabase functions deploy send-handover-email
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail } from "../_shared/mailer.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
// Optional fixed app URL; otherwise the caller's origin is used (validated below).
const APP_URL = Deno.env.get("APP_URL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not signed in" }, 401);
    const { documentId, appUrl } = (await req.json()) as { documentId?: string; appUrl?: string };
    if (!documentId) return json({ error: "documentId is required" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: doc, error } = await supabase.from("handover_documents").select("*").eq("id", documentId).maybeSingle();
    if (error) throw error;
    if (!doc) return json({ error: "Document not found" }, 404);
    if (doc.status !== "pending") return json({ error: "Document is not awaiting signature" }, 409);

    let base = APP_URL || appUrl || "";
    try {
      const u = new URL(base);
      if (!["https:", "http:"].includes(u.protocol)) throw new Error();
      base = u.origin;
    } catch {
      return json({ error: "Invalid app URL" }, 400);
    }
    const link = `${base}/sign/${doc.id}`;
    const items = (doc.items as { tag: string; name: string; serial?: string }[]) || [];
    const rows = items
      .map((i) => `<tr><td style="padding:8px;border:1px solid #E2E5EB;font-family:monospace">${escapeHtml(i.tag)}</td><td style="padding:8px;border:1px solid #E2E5EB">${escapeHtml(i.name)}</td><td style="padding:8px;border:1px solid #E2E5EB;font-family:monospace">${escapeHtml(i.serial || "-")}</td></tr>`)
      .join("");
    const kindLabel = doc.kind === "return" ? "return" : "handover";

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#12151B;line-height:1.5">
      <p>Hi ${escapeHtml(doc.employee_name)},</p>
      <p>Please review and sign the asset ${kindLabel} form for the following item${items.length === 1 ? "" : "s"}:</p>
      <table style="border-collapse:collapse;margin:12px 0"><thead><tr>
        <th style="padding:8px;border:1px solid #E2E5EB;background:#FAFAFB;text-align:left">Tag</th>
        <th style="padding:8px;border:1px solid #E2E5EB;background:#FAFAFB;text-align:left">Asset</th>
        <th style="padding:8px;border:1px solid #E2E5EB;background:#FAFAFB;text-align:left">Serial</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <p><a href="${link}" style="display:inline-block;background:#02019B;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Review &amp; sign</a></p>
      <p style="color:#6B7385;font-size:13px">Sign in with your KOTU Google account. If you didn't receive these items, reply to IT before signing.</p>
      <p>Regards,<br>IT &amp; Tech</p>
    </body></html>`;

    const result = await sendEmail({ to: [doc.employee_email], subject: `Please sign your asset ${kindLabel} form`, html });
    return json({ success: true, mock: result.mock });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
