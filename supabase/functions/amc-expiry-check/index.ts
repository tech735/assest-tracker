// Scheduled AMC (Annual Maintenance Contract) expiry check.
//
// Meant to run on a recurring schedule (see supabase/migrations/0005_amc_expiry_cron.sql),
// NOT on page load / user action. Each run:
//   1. Loads every asset that has an amc_end_date.
//   2. Works out days remaining until expiry for each.
//   3. Matches assets against the configured reminder windows (REMINDER_DAYS below).
//   4. Skips anything already logged in amc_notifications for that asset/stage/end-date,
//      so reruns (including a cron retry the same day) never send duplicate emails.
//   5. Sends one consolidated report email via the shared mailer (../_shared/mailer.ts).
//   6. Logs a row per notified asset only after the email send succeeds, so a failed
//      send is retried automatically on the next run instead of being silently dropped.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail } from "../_shared/mailer.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AMC_NOTIFICATION_EMAIL = Deno.env.get("AMC_NOTIFICATION_EMAIL");
const RESEND_API_KEY_AMC = Deno.env.get("RESEND_API_KEY_AMC");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Reminder windows, in days before amc_end_date. This is the single source of
// truth for the backend reminder cadence — keep in sync with the display-only
// AMC_REMINDER_DAYS constant in src/lib/amc.ts (used for the "Expiring Soon"
// badge threshold), and change only here to retune when reminders go out.
const REMINDER_DAYS = [30, 15, 7];
const SORTED_THRESHOLDS = [...REMINDER_DAYS].sort((a, b) => b - a);

interface AssetRow {
  id: string;
  name: string;
  asset_tag: string;
  category: string | null;
  location: string | null;
  assigned_to: string | null;
  amc_start_date: string | null;
  amc_end_date: string;
}

function daysUntil(dateStr: string): number {
  const todayUTC = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  );
  const target = new Date(dateStr);
  const targetUTC = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return Math.round((targetUTC - todayUTC) / (1000 * 60 * 60 * 24));
}

// Returns the reminder stage (a value from REMINDER_DAYS) this many days-remaining
// falls into, or null if it isn't due for a reminder. Using a window per stage
// (rather than an exact day match) means a cron run that was delayed a day or two
// still catches the reminder instead of silently skipping it.
function matchReminderStage(daysRemaining: number): number | null {
  if (daysRemaining < 0) return null;
  for (let i = 0; i < SORTED_THRESHOLDS.length; i++) {
    const threshold = SORTED_THRESHOLDS[i];
    const lowerBound = i + 1 < SORTED_THRESHOLDS.length ? SORTED_THRESHOLDS[i + 1] : -1;
    if (daysRemaining <= threshold && daysRemaining > lowerBound) {
      return threshold;
    }
  }
  return null;
}

function buildReportHtml(rows: Array<{ asset: AssetRow; daysRemaining: number }>): string {
  const tableRows = rows
    .map(({ asset, daysRemaining }) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${asset.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${asset.asset_tag}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${asset.category || "N/A"}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${asset.location || "N/A"}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${asset.assigned_to || "Unassigned"}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${asset.amc_start_date ? new Date(asset.amc_start_date).toLocaleDateString() : "N/A"}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${new Date(asset.amc_end_date).toLocaleDateString()}</td>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${daysRemaining} day${daysRemaining === 1 ? "" : "s"}</td>
      </tr>
    `)
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #f4f4f4; text-align: left; padding: 10px; border: 1px solid #ddd; }
        td { padding: 10px; border: 1px solid #ddd; }
        .header { margin-bottom: 20px; }
        .footer { margin-top: 30px; font-size: 0.9em; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <p>Hello,</p>
        <p>The following assets are approaching their AMC expiry date. Please review the details below and take the necessary action for renewal or follow-up.</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Asset Name</th>
            <th>Asset ID</th>
            <th>Category</th>
            <th>Location</th>
            <th>Assigned To</th>
            <th>AMC Start Date</th>
            <th>AMC End Date</th>
            <th>Days Remaining</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <div class="footer">
        <p>This is an automated reminder from Asset Compass. No action is needed if renewal is already in progress.</p>
        <p>Regards,<br>Asset Compass</p>
      </div>
    </body>
    </html>
  `;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!AMC_NOTIFICATION_EMAIL) {
      throw new Error("AMC_NOTIFICATION_EMAIL secret is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Load every asset with an AMC end date.
    const { data: assets, error: assetsError } = await supabase
      .from("assets")
      .select("id, name, asset_tag, category, location, assigned_to, amc_start_date, amc_end_date")
      .not("amc_end_date", "is", null);

    if (assetsError) throw new Error(`Failed to fetch assets: ${assetsError.message}`);

    const candidates = ((assets || []) as AssetRow[])
      .map((asset) => ({ asset, daysRemaining: daysUntil(asset.amc_end_date) }))
      .map(({ asset, daysRemaining }) => ({ asset, daysRemaining, stage: matchReminderStage(daysRemaining) }))
      .filter((c): c is { asset: AssetRow; daysRemaining: number; stage: number } => c.stage !== null);

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ message: "No assets due for an AMC reminder", notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Exclude anything already notified for this asset/stage/contract-end-date.
    const assetIds = [...new Set(candidates.map((c) => c.asset.id))];
    const { data: existingLogs, error: logsError } = await supabase
      .from("amc_notifications")
      .select("asset_id, reminder_days, amc_end_date")
      .in("asset_id", assetIds);

    if (logsError) throw new Error(`Failed to fetch amc_notifications: ${logsError.message}`);

    const alreadySent = new Set(
      (existingLogs || []).map((log) => `${log.asset_id}|${log.reminder_days}|${log.amc_end_date}`),
    );

    const toNotify = candidates
      .filter((c) => !alreadySent.has(`${c.asset.id}|${c.stage}|${c.asset.amc_end_date}`))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    if (toNotify.length === 0) {
      return new Response(
        JSON.stringify({ message: "All due AMC reminders were already sent", notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Send one consolidated report email.
    const subject = `AMC Expiry Reminder — ${toNotify.length} Asset${toNotify.length === 1 ? "" : "s"} Requiring Attention`;
    const html = buildReportHtml(toNotify);
    const emailResult = await sendEmail({ to: [AMC_NOTIFICATION_EMAIL], subject, html, apiKey: RESEND_API_KEY_AMC });

    // 4. Only log successfully-notified reminders, so a send failure is retried
    //    automatically on the next scheduled run rather than being lost.
    const logRows = toNotify.map(({ asset, stage }) => ({
      asset_id: asset.id,
      reminder_days: stage,
      amc_end_date: asset.amc_end_date,
    }));

    const { error: insertError } = await supabase
      .from("amc_notifications")
      .upsert(logRows, { onConflict: "asset_id,reminder_days,amc_end_date", ignoreDuplicates: true });

    if (insertError) {
      // The email already went out; failing to record it just risks a duplicate
      // on the next run, so log loudly rather than throwing.
      console.error("Failed to record amc_notifications after successful send:", insertError.message);
    }

    return new Response(
      JSON.stringify({
        message: "AMC expiry reminder email sent",
        notified: toNotify.length,
        mock: emailResult.mock,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("amc-expiry-check failed:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
