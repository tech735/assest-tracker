// Emails an employee the list of assets currently assigned to them (People → profile → "Email summary").
//
// Security: staff only (people or check-out permission); data is read with the CALLER's JWT so row-level
// security applies; the email only goes to the employee's own address on record; one email per
// employee per 10 minutes.
// Deploy: supabase functions deploy send-asset-email
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendEmail } from "../_shared/mailer.ts";
import { checkThrottle, recordEmail, requireCaller } from "../_shared/guard.ts";
import { PublicError, corsHeaders, errorResponse, json } from "../_shared/http.ts";
import { APP_URL, IT_EMAIL, button, deviceKind, emailLayout, escapeHtml, facts, formatDate, itemList, sectionTitle, spacer, supportList, titleCase } from "../_shared/emailLayout.ts";

const RESEND_API_KEY_ASSET_SUMMARY = Deno.env.get("RESEND_API_KEY_ASSET_SUMMARY");

type AssetRow = { id: string; category?: string; name: string; asset_tag: string; serial_number?: string; condition?: string; brand?: string; model?: string; updated_at: string };

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const caller = await requireCaller(req);
    if (!caller.can("people.manage") && !caller.can("assets.checkout")) throw new PublicError("You don't have permission to email asset summaries", 403);
    const { employeeId } = (await req.json()) as { employeeId?: string };
    if (!employeeId) throw new PublicError("Employee ID is required");
    const supabase = caller.db;

    const { data: employee, error: empError } = await supabase.from("employees").select("id, name, email").eq("id", employeeId).maybeSingle();
    if (empError) throw empError;
    if (!employee) throw new PublicError("Employee not found", 404);
    if (!employee.email) throw new PublicError("Employee has no email address registered");
    await checkThrottle("send-asset-email", employee.id, 10);

    const { data: assets, error: assetError } = await supabase
      .from("assets")
      .select("id, category, name, asset_tag, serial_number, condition, brand, model, updated_at")
      .eq("assigned_to_id", employeeId)
      .eq("status", "assigned")
      .order("category")
      .order("name");
    if (assetError) throw assetError;
    const list = (assets || []) as AssetRow[];

    // When each item was handed over: the latest check-out of that asset to this employee.
    const since = new Map<string, string>();
    if (list.length) {
      const { data: events } = await supabase
        .from("assignments")
        .select("asset_id, assigned_date")
        .eq("employee_id", employeeId)
        .eq("event_type", "assign")
        .in("asset_id", list.map((a) => a.id));
      for (const e of events || []) if (!since.has(e.asset_id) || e.assigned_date > since.get(e.asset_id)!) since.set(e.asset_id, e.assigned_date);
    }

    const firstName = String(employee.name || "").split(" ")[0] || "there";
    const today = formatDate(new Date().toISOString());
    const count = `${list.length} item${list.length === 1 ? "" : "s"}`;

    const html = emailLayout({
      preheader: `${count} on record as assigned to you as of ${today}.`,
      eyebrow: "Asset summary",
      title: "Your assigned equipment",
      intro: `Hi ${escapeHtml(firstName)}, this is everything IT has on record as assigned to you. Please check it matches what you have.`,
      body: [
        facts([
          { label: "Employee", value: escapeHtml(employee.name) },
          { label: "Items", value: String(list.length) },
          { label: "As of", value: today },
        ]),
        spacer(28),
        sectionTitle("Assigned to you", count),
        itemList(
          list.map((a) => ({
            name: a.name,
            kind: deviceKind(a),
            detail: [titleCase(a.category), a.asset_tag].filter(Boolean).join(" · "),
            serial: a.serial_number,
            asideLabel: "Since",
            asideValue: formatDate(since.get(a.id) || a.updated_at),
          })),
        ),
        spacer(28),
        button(`${APP_URL}/me`, "View my assets"),
        spacer(36),
        supportList("Need help?", [
          { label: "Something’s broken", hint: "Report a problem from My assets and IT will log a repair.", href: `${APP_URL}/me` },
          { label: "Something here isn’t with you", hint: `Reply to this email or write to ${IT_EMAIL} with the asset tag.`, href: `mailto:${IT_EMAIL}?subject=${encodeURIComponent("Asset summary — correction")}` },
        ]),
      ].join(""),
    });

    const result = await sendEmail({
      to: [employee.email],
      subject: `Your assigned assets (${count}) — KOTU IT`,
      html,
      apiKey: RESEND_API_KEY_ASSET_SUMMARY,
    });
    if (result.mock) throw new PublicError("Email isn't configured on the server (no Resend key)", 503);
    await recordEmail("send-asset-email", employee.id, caller.id);
    return json(req, { message: "Email sent" });
  } catch (e) {
    return errorResponse(req, "send-asset-email", e);
  }
});
