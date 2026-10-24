// Emails an employee the link to sign their handover/return form.
//
// Security: the document is loaded with the CALLER's JWT (not the service role), so row-level
// security decides whether they may see it — only IT staff and the employee themselves can.
// Deploy: supabase functions deploy send-handover-email
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendEmail } from "../_shared/mailer.ts";
import { checkThrottle, recordEmail, requireCaller } from "../_shared/guard.ts";
import { PublicError, corsHeaders, errorResponse, json } from "../_shared/http.ts";
import { APP_URL, IT_EMAIL, button, deviceKind, emailLayout, escapeHtml, facts, formatDate, itemList, sectionTitle, spacer, supportList, titleCase } from "../_shared/emailLayout.ts";


type Item = { tag: string; name: string; serial?: string; brand?: string; condition?: string; accessories?: string };

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const caller = await requireCaller(req);
    const { documentId } = (await req.json()) as { documentId?: string };
    if (!documentId) throw new PublicError("documentId is required");

    // Read as the caller: only IT staff and the employee named on the form can see it.
    const { data: doc, error } = await caller.db.from("handover_documents").select("*").eq("id", documentId).maybeSingle();
    if (error) throw error;
    if (!doc) throw new PublicError("Document not found", 404);
    if (doc.status !== "pending") throw new PublicError("Document is not awaiting signature", 409);
    if (!doc.employee_email) throw new PublicError("The employee has no email address");
    await checkThrottle("send-handover-email", doc.id, 10);

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
    if (result.mock) throw new PublicError("Email isn't configured on the server (no Resend key)", 503);
    await recordEmail("send-handover-email", doc.id, caller.id);
    return json(req, { success: true });
  } catch (e) {
    return errorResponse(req, "send-handover-email", e);
  }
});
