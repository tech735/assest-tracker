// Emails an employee the list of assets currently assigned to them (People → profile → "Email summary").
//
// Security: data is read with the CALLER's JWT, so only signed-in staff can trigger it (row-level
// security applies), and the email only ever goes to the employee's own address on record.
// Deploy: supabase functions deploy send-asset-email
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail } from "../_shared/mailer.ts";
import { APP_URL, IT_EMAIL, button, emailLayout, escapeHtml, formatDate, itemList, note, spacer, titleCase } from "../_shared/emailLayout.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY_ASSET_SUMMARY = Deno.env.get("RESEND_API_KEY_ASSET_SUMMARY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AssetRow = { id: string; category?: string; name: string; asset_tag: string; serial_number?: string; condition?: string; brand?: string; model?: string; updated_at: string };

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not signed in" }, 401);
    const { employeeId } = (await req.json()) as { employeeId?: string };
    if (!employeeId) return json({ error: "Employee ID is required" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: user } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    if (!user?.user) return json({ error: "Not signed in" }, 401);

    const { data: employee, error: empError } = await supabase.from("employees").select("id, name, email").eq("id", employeeId).maybeSingle();
    if (empError) throw empError;
    if (!employee) return json({ error: "Employee not found" }, 404);
    if (!employee.email) return json({ error: "Employee has no email address registered" }, 400);

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
      title: "Your assigned assets",
      intro: `Hi ${escapeHtml(firstName)}, here’s everything IT has on record as assigned to you as of <strong style="color:#12151B;">${today}</strong> — ${count}.`,
      body: [
        itemList(
          list.map((a) => ({
            name: a.name,
            type: titleCase(a.category),
            tag: a.asset_tag,
            serial: a.serial_number,
            meta: `Since ${formatDate(since.get(a.id) || a.updated_at)}`,
            sub: a.condition ? `${titleCase(a.condition)} condition` : undefined,
          })),
        ),
        spacer(22),
        button(`${APP_URL}/me`, "View my assets"),
        spacer(22),
        note(`Something missing, or not with you? Reply to this email or write to <a href="mailto:${IT_EMAIL}" style="color:#02019B;">${IT_EMAIL}</a> with the asset tag (on the label) so IT can update the record.`),
      ].join(""),
    });

    const result = await sendEmail({
      to: [employee.email],
      subject: `Your assigned assets (${count}) — KOTU IT`,
      html,
      apiKey: RESEND_API_KEY_ASSET_SUMMARY,
    });
    return json(result.mock ? { message: "Email simulation successful (See logs)", mock: true } : { message: "Email sent", mock: false });
  } catch (error: unknown) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
