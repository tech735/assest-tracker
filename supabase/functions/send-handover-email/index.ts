// Emails an employee the link to sign their handover/return form.
//
// Security: the document is loaded with the CALLER's JWT (not the service role), so row-level
// security decides whether they may see it — only IT staff and the employee themselves can.
// Deploy: supabase functions deploy send-handover-email
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail } from "../_shared/mailer.ts";
import { APP_URL, IT_EMAIL, button, deviceKind, emailLayout, escapeHtml, facts, formatDate, itemList, sectionTitle, spacer, supportList, titleCase } from "../_shared/emailLayout.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Item = { tag: string; name: string; serial?: string; brand?: string; condition?: string; accessories?: string };

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not signed in" }, 401);
    const { documentId } = (await req.json()) as { documentId?: string };
    if (!documentId) return json({ error: "documentId is required" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: doc, error } = await supabase.from("handover_documents").select("*").eq("id", documentId).maybeSingle();
    if (error) throw error;
    if (!doc) return json({ error: "Document not found" }, 404);
    if (doc.status !== "pending") return json({ error: "Document is not awaiting signature" }, 409);
    if (!doc.employee_email) return json({ error: "The employee has no email address" }, 400);

    // The link always points at the real app (APP_URL), never at a caller-supplied origin.
    const link = `${APP_URL}/sign/${doc.id}`;
    const items = ((doc.items as Item[]) || []).map((i) => ({
      name: i.name,
      kind: deviceKind({ name: i.name, brand: i.brand }),
      detail: [i.brand, i.tag].filter(Boolean).join(" · "),
      serial: i.serial,
      note: i.accessories ? `With ${i.accessories}` : undefined,
      asideLabel: i.condition ? "Condition" : undefined,
      asideValue: i.condition ? titleCase(i.condition) : undefined,
    }));
    const isReturn = doc.kind === "return";
    const firstName = String(doc.employee_name || "").split(" ")[0] || "there";
    const count = `${items.length} item${items.length === 1 ? "" : "s"}`;
    const docNo = `HO-${new Date(doc.created_at).getFullYear()}-${String(doc.doc_no).padStart(4, "0")}`;

    const html = emailLayout({
      preheader: `Please review and sign ${docNo} for ${count}.`,
      eyebrow: "Action needed",
      title: isReturn ? "Sign your return form" : "Sign your handover form",
      intro: `Hi ${escapeHtml(firstName)}, ${doc.handed_over_by ? escapeHtml(doc.handed_over_by) : "IT"} ${isReturn ? "has recorded the return of" : "has handed over"} the ${count} below. Check them, then sign — it takes under a minute.`,
      body: [
        facts([
          { label: "Form", value: `<span style="font-family:'SFMono-Regular',Consolas,Menlo,monospace;">${docNo}</span>` },
          { label: "Issued", value: formatDate(doc.created_at) },
        ]),
        spacer(28),
        sectionTitle("Items", count),
        itemList(items),
        spacer(28),
        button(link, "Review & sign"),
        spacer(12),
        `<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:19px;color:#6B7385;text-align:center;">Sign in with your KOTU Google account — the link only works for you.</p>`,
        spacer(36),
        supportList("Something not right?", [
          { label: "I didn’t receive an item", hint: "Don’t sign. Reply to this email and IT will correct the form.", href: `mailto:${IT_EMAIL}?subject=${encodeURIComponent(`${docNo} — correction`)}` },
        ]),
      ].join(""),
    });

    const result = await sendEmail({ to: [doc.employee_email], subject: `Action needed: sign your asset ${isReturn ? "return" : "handover"} form (${docNo})`, html });
    if (result.mock) return json({ error: "No Resend API key is set on Supabase (RESEND_API_KEY)" }, 503);
    return json({ success: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
