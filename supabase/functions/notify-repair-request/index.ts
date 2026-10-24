// Emails IT when an employee reports a problem with their asset (My assets → Report a problem).
//
// Security: the request is read with the CALLER's JWT, so only its reporter (or IT) can trigger the
// email, and it always goes to the IT inbox — never to an address from the request body.
// Deploy: supabase functions deploy notify-repair-request
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendEmail } from "../_shared/mailer.ts";
import { checkThrottle, recordEmail, requireCaller } from "../_shared/guard.ts";
import { PublicError, corsHeaders, errorResponse, json } from "../_shared/http.ts";
import { APP_URL, IT_EMAIL, button, deviceKind, emailLayout, escapeHtml, facts, formatDate, itemList, sectionTitle, spacer } from "../_shared/emailLayout.ts";

const TO = Deno.env.get("REPAIR_NOTIFICATION_EMAIL") || IT_EMAIL;

const URGENCY: Record<string, string> = { high: "Urgent", normal: "Soon", low: "Can wait" };

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const caller = await requireCaller(req);
    const { requestId } = (await req.json()) as { requestId?: string };
    if (!requestId) throw new PublicError("requestId is required");

    // Read as the caller: only the reporter (or maintenance staff) can see the request.
    const { data: r, error } = await caller.db.from("repair_requests").select("*").eq("id", requestId).maybeSingle();
    if (error) throw error;
    if (!r) throw new PublicError("Request not found", 404);
    await checkThrottle("notify-repair-request", r.id, 0);
    const { data: asset } = await caller.db.from("assets").select("name, category, brand, model, serial_number, asset_tag").eq("id", r.asset_id).maybeSingle();

    const who = r.reporter_name || r.reporter_email || "An employee";
    const urgency = URGENCY[r.urgency] || "Soon";
    const html = emailLayout({
      preheader: `${who} reported a problem with ${r.asset_tag}: ${String(r.issue).slice(0, 90)}`,
      eyebrow: r.urgency === "high" ? "Urgent repair request" : "Repair request",
      title: `${r.asset_name || "An asset"} needs attention`,
      intro: `${escapeHtml(who)} reported a problem from My assets.`,
      body: [
        facts([
          { label: "Reported by", value: escapeHtml(who) },
          { label: "Urgency", value: escapeHtml(urgency) },
          { label: "Date", value: formatDate(r.created_at) },
        ]),
        spacer(24),
        `<div style="padding:16px 18px;border-left:3px solid #02019B;background:#F7F8FA;border-radius:0 10px 10px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:#111318;white-space:pre-wrap;">${escapeHtml(r.issue)}</div>`,
        spacer(28),
        sectionTitle("Asset"),
        itemList([
          {
            name: asset?.name || r.asset_name || "Asset",
            kind: deviceKind(asset || { name: r.asset_name }),
            detail: [asset?.brand, asset?.model, r.asset_tag].filter(Boolean).join(" · "),
            serial: asset?.serial_number,
          },
        ]),
        spacer(28),
        button(`${APP_URL}/maintenance?tab=requests`, "Open in Maintenance"),
        spacer(12),
        `<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:19px;color:#6B7385;text-align:center;">Reply to this email to answer ${escapeHtml(who)} directly.</p>`,
      ].join(""),
    });

    const result = await sendEmail({
      to: [TO],
      subject: `${r.urgency === "high" ? "[Urgent] " : ""}Repair request: ${r.asset_tag} — ${who}`,
      html,
      replyTo: r.reporter_email || undefined,
    });
    if (result.mock) throw new PublicError("Email isn't configured on the server (no Resend key)", 503);
    await recordEmail("notify-repair-request", r.id, caller.id);
    return json(req, { success: true });
  } catch (e) {
    return errorResponse(req, "notify-repair-request", e);
  }
});
