// Shared look for every email the asset tracker sends: KOTU logo header, white card on a light
// background, footer with IT contact. Table-based with inline styles so it renders the same in
// Gmail, Outlook and phone mail apps.

export const APP_URL = (Deno.env.get("APP_URL") || "https://asset.kotu.co.in").replace(/\/+$/, "");
export const IT_EMAIL = "tech@kotu.co.in";

const C = { brand: "#02019B", ink: "#12151B", muted: "#6B7385", faint: "#9AA1AE", line: "#E6E8EC", page: "#F4F5F7", soft: "#F7F8FA", tagBg: "#EEF0FF" };
const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

export const escapeHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const formatDate = (d?: string | null) => {
  if (!d) return "—";
  const date = new Date(d.length === 10 ? `${d}T00:00:00Z` : d);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
};

export const titleCase = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");

export function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td bgcolor="${C.brand}" style="border-radius:8px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
    </td></tr></table>`;
}

export interface EmailItem {
  name: string;
  type?: string;
  tag: string;
  serial?: string | null;
  meta?: string; // e.g. "Since 3 Feb 2026"
  sub?: string; // e.g. "Good condition"
}

/** Asset list as stacked rows (reads well on phones, unlike a 7-column table). */
export function itemList(items: EmailItem[]) {
  if (!items.length) return `<p style="margin:0;padding:16px;border:1px solid ${C.line};border-radius:10px;font-family:${FONT};font-size:14px;color:${C.muted};text-align:center;">Nothing is assigned to you right now.</p>`;
  const rows = items
    .map((it, i) => {
      const extra = [it.meta, it.sub].filter(Boolean).map((x) => escapeHtml(x)).join(" &nbsp;·&nbsp; ");
      return `<tr><td style="padding:14px 16px;${i ? `border-top:1px solid ${C.line};` : ""}font-family:${FONT};">
        <div style="font-size:15px;font-weight:600;color:${C.ink};">${escapeHtml(it.name)}${it.type ? ` <span style="display:inline-block;margin-left:6px;padding:1px 8px;border-radius:999px;background:${C.tagBg};color:${C.brand};font-size:12px;font-weight:500;vertical-align:1px;">${escapeHtml(it.type)}</span>` : ""}</div>
        <div style="margin-top:3px;font-size:13px;color:${C.muted};"><span style="font-family:${MONO};color:${C.ink};">${escapeHtml(it.tag)}</span>${it.serial ? ` &nbsp;·&nbsp; S/N <span style="font-family:${MONO};">${escapeHtml(it.serial)}</span>` : ""}</div>
        ${extra ? `<div style="margin-top:3px;font-size:13px;color:${C.muted};">${extra}</div>` : ""}
      </td></tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.line};border-radius:10px;border-collapse:separate;">${rows}</table>`;
}

export function note(html: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="padding:12px 14px;background:${C.soft};border-radius:8px;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};">${html}</td></tr></table>`;
}

export function emailLayout({ preheader, title, intro, body }: { preheader: string; title: string; intro: string; body: string }) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${C.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        <tr><td style="padding:0 4px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:middle;"><img src="${APP_URL}/kotu-logo.png" width="36" height="36" alt="KOTU" style="display:block;border:0;border-radius:8px;"></td>
            <td style="vertical-align:middle;padding-left:10px;font-family:${FONT};">
              <div style="font-size:15px;font-weight:700;color:${C.ink};line-height:18px;">Asset Tracker</div>
              <div style="font-size:12px;color:${C.muted};line-height:16px;">KOTU · IT &amp; Tech</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${C.line};border-radius:14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="height:4px;line-height:4px;font-size:0;background:${C.brand};border-radius:14px 14px 0 0;">&nbsp;</td></tr>
            <tr><td style="padding:28px 28px 8px;font-family:${FONT};">
              <h1 style="margin:0 0 8px;font-size:22px;line-height:28px;font-weight:700;color:${C.ink};">${escapeHtml(title)}</h1>
              <p style="margin:0;font-size:15px;line-height:23px;color:${C.muted};">${intro}</p>
            </td></tr>
            <tr><td style="padding:20px 28px 28px;font-family:${FONT};font-size:15px;line-height:23px;color:${C.ink};">${body}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 8px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.faint};text-align:center;">
          IT &amp; Tech · School Style Supplies Pvt. Ltd. (KOTU)<br>
          Questions? Reply to this email or write to <a href="mailto:${IT_EMAIL}" style="color:${C.muted};">${IT_EMAIL}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export const spacer = (px = 20) => `<div style="height:${px}px;line-height:${px}px;font-size:0;">&nbsp;</div>`;
