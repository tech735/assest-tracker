// Shared look for every email the asset tracker sends. Modelled on receipt emails (Shop, Blue Apron):
// white page, brand mark, one strong headline, a facts strip with small caps labels, item rows with a
// device thumbnail, one full-width button and a short support list. Table-based with inline styles so
// it renders the same in Gmail, Outlook and phone mail apps.

export const APP_URL = (Deno.env.get("APP_URL") || "https://asset.kotu.co.in").replace(/\/+$/, "");
export const IT_EMAIL = "tech@kotu.co.in";

const C = { brand: "#02019B", ink: "#111318", body: "#3D4350", muted: "#6B7385", faint: "#9AA1AE", line: "#ECEEF2", soft: "#F7F8FA" };
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

export const escapeHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const formatDate = (d?: string | null) => {
  if (!d) return "—";
  const date = new Date(d.length === 10 ? `${d}T00:00:00Z` : d);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
};

export const titleCase = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");

// Same rules as src/components/app/DeviceArt.tsx (deviceKind) — thumbnails live in public/email/<kind>.png.
const BY_CATEGORY: Record<string, string> = { laptop: "laptop", notebook: "laptop", desktop: "desktop", monitor: "monitor", display: "monitor", phone: "phone", mobile: "phone", tablet: "tablet", printer: "printer" };
const BY_NAME: [string, RegExp][] = [
  ["bag", /\b(bag|backpack|sleeve|pouch|case)\b/],
  ["headphones", /head(phone|set)|earphone|earbud|airpods/],
  ["mouse", /\bmouse\b|mx master/],
  ["keyboard", /keyboard|mx keys/],
  ["charger", /charger|adapter|power ?bank|cable|dongle|\bhub\b/],
  ["printer", /printer|scanner|laserjet|deskjet|inkjet/],
  ["laptop", /laptop|notebook|macbook|thinkpad|latitude|elitebook|probook|vivobook|zenbook|ideapad|inspiron|vostro|pavilion|victus|viktus|surface laptop/],
  ["tablet", /tablet|ipad|galaxy tab/],
  ["phone", /phone|iphone|pixel|galaxy|mobile/],
  ["monitor", /monitor|display/],
  ["desktop", /desktop|tower|imac|optiplex|workstation|mini pc/],
];
export function deviceKind(a: { category?: string | null; name?: string | null; model?: string | null; brand?: string | null }) {
  const cat = (a.category || "").trim().toLowerCase().replace(/s$/, "");
  if (BY_CATEGORY[cat]) return BY_CATEGORY[cat];
  const text = `${a.name || ""} ${a.model || ""} ${a.brand || ""}`.toLowerCase();
  return BY_NAME.find(([, re]) => re.test(text))?.[0] ?? "box";
}

/* ---------------- Building blocks ---------------- */

export const spacer = (px = 24) => `<div style="height:${px}px;line-height:${px}px;font-size:0;">&nbsp;</div>`;

export function button(href: string, label: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="center" bgcolor="${C.brand}" style="border-radius:10px;">
      <a href="${escapeHtml(href)}" style="display:block;padding:14px 20px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
    </td></tr></table>`;
}

/** Small-caps label over a value, side by side (like "DELIVERY DATE / Monday, Sep 1"). */
export function facts(items: { label: string; value: string }[]) {
  const cells = items
    .map((f, i) => `<td valign="top" style="padding:14px 16px;${i ? `border-left:1px solid ${C.line};` : ""}font-family:${FONT};">
      <div style="font-size:11px;line-height:14px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${C.faint};">${escapeHtml(f.label)}</div>
      <div style="margin-top:4px;font-size:15px;line-height:20px;font-weight:600;color:${C.ink};">${f.value}</div>
    </td>`)
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.soft}" style="background:${C.soft};border-radius:12px;"><tr>${cells}</tr></table>`;
}

export interface EmailItem {
  name: string;
  kind: string; // thumbnail, from deviceKind()
  detail: string; // e.g. "Laptop · AST-1100"
  serial?: string | null;
  asideLabel?: string; // e.g. "Since"
  asideValue?: string; // e.g. "3 Feb 2026"
  note?: string; // e.g. "With charger, bag"
}

/** Item rows with a device thumbnail, divided by hairlines. */
export function itemList(items: EmailItem[], emptyText = "Nothing is assigned to you right now.") {
  if (!items.length) return `<p style="margin:0;padding:20px 0;font-family:${FONT};font-size:14px;color:${C.muted};">${escapeHtml(emptyText)}</p>`;
  const rows = items
    .map((it, i) => `<tr>
      <td width="56" valign="top" style="padding:16px 14px 16px 0;${i ? `border-top:1px solid ${C.line};` : ""}">
        <img src="${APP_URL}/email/${it.kind}.png" width="56" height="56" alt="" style="display:block;border:0;width:56px;height:56px;">
      </td>
      <td valign="top" style="padding:16px 0;${i ? `border-top:1px solid ${C.line};` : ""}font-family:${FONT};">
        <div style="font-size:15px;line-height:21px;font-weight:600;color:${C.ink};">${escapeHtml(it.name)}</div>
        <div style="font-size:13px;line-height:19px;color:${C.muted};">${escapeHtml(it.detail)}</div>
        ${it.serial ? `<div style="font-size:12px;line-height:18px;color:${C.faint};">S/N <span style="font-family:${MONO};color:${C.muted};">${escapeHtml(it.serial)}</span></div>` : ""}
        ${it.note ? `<div style="font-size:12px;line-height:18px;color:${C.muted};">${escapeHtml(it.note)}</div>` : ""}
      </td>
      <td valign="top" align="right" style="padding:16px 0 16px 12px;${i ? `border-top:1px solid ${C.line};` : ""}font-family:${FONT};white-space:nowrap;">
        ${it.asideLabel ? `<div style="font-size:11px;line-height:14px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${C.faint};">${escapeHtml(it.asideLabel)}</div>` : ""}
        ${it.asideValue ? `<div style="margin-top:3px;font-size:13px;line-height:18px;color:${C.ink};">${escapeHtml(it.asideValue)}</div>` : ""}
      </td>
    </tr>`)
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
}

/** "Need help?" rows with a chevron, like a support menu. */
export function supportList(title: string, rows: { label: string; hint: string; href: string }[]) {
  const body = rows
    .map((r, i) => `<tr><td style="padding:14px 0;${i ? `border-top:1px solid ${C.line};` : ""}font-family:${FONT};">
      <a href="${escapeHtml(r.href)}" style="text-decoration:none;display:block;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font-family:${FONT};"><div style="font-size:14px;line-height:20px;font-weight:600;color:${C.ink};">${escapeHtml(r.label)}</div><div style="font-size:13px;line-height:19px;color:${C.muted};">${escapeHtml(r.hint)}</div></td>
          <td width="20" align="right" style="font-family:${FONT};font-size:20px;line-height:20px;color:${C.faint};">&rsaquo;</td>
        </tr></table>
      </a>
    </td></tr>`)
    .join("");
  return `<div style="font-family:${FONT};font-size:13px;line-height:18px;font-weight:600;color:${C.ink};margin-bottom:2px;">${escapeHtml(title)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.line};border-bottom:1px solid ${C.line};">${body}</table>`;
}

export const sectionTitle = (text: string, aside = "") =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid ${C.line};"><tr>
    <td style="padding-bottom:10px;font-family:${FONT};font-size:13px;line-height:18px;font-weight:600;color:${C.ink};">${escapeHtml(text)}</td>
    <td align="right" style="padding-bottom:10px;font-family:${FONT};font-size:13px;line-height:18px;color:${C.muted};">${escapeHtml(aside)}</td>
  </tr></table>`;

/* ---------------- Page ---------------- */

export function emailLayout({ preheader, eyebrow, title, intro, body }: { preheader: string; eyebrow: string; title: string; intro: string; body: string }) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;">
    <tr><td align="center" style="padding:32px 20px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td style="padding-bottom:36px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle"><img src="${APP_URL}/kotu-logo.png" width="32" height="32" alt="KOTU" style="display:block;border:0;border-radius:8px;"></td>
            <td valign="middle" style="padding-left:10px;font-family:${FONT};font-size:14px;line-height:18px;font-weight:600;color:${C.ink};">KOTU <span style="font-weight:400;color:${C.muted};">Asset Tracker</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="font-family:${FONT};">
          <div style="font-size:12px;line-height:16px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${C.brand};">${escapeHtml(eyebrow)}</div>
          <h1 style="margin:10px 0 0;font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.02em;color:${C.ink};">${escapeHtml(title)}</h1>
          <p style="margin:12px 0 0;font-size:15px;line-height:24px;color:${C.body};">${intro}</p>
        </td></tr>
        <tr><td style="padding-top:28px;">${body}</td></tr>
        <tr><td style="padding-top:40px;font-family:${FONT};font-size:12px;line-height:19px;color:${C.faint};">
          Sent by IT &amp; Tech, School Style Supplies Pvt. Ltd. (KOTU) · <a href="mailto:${IT_EMAIL}" style="color:${C.muted};text-decoration:underline;">${IT_EMAIL}</a><br>
          You’re receiving this because company equipment is assigned to you.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
