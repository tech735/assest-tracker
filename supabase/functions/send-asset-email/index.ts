import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
    employeeId: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { employeeId } = await req.json() as EmailRequest;

        if (!employeeId) {
            throw new Error("Employee ID is required");
        }

        // 1. Fetch Employee Details
        const { data: employee, error: empError } = await supabase
            .from("employees")
            .select("*")
            .eq("id", employeeId)
            .single();

        if (empError || !employee) {
            throw new Error(`Employee not found: ${empError?.message}`);
        }

        if (!employee.email) {
            throw new Error("Employee has no email address registered");
        }

        // 2. Fetch Assigned Assets
        const { data: assets, error: assetError } = await supabase
            .from("assets")
            .select("*")
            .eq("assigned_to_id", employeeId)
            .eq("status", "assigned");

        if (assetError) {
            throw new Error(`Failed to fetch assets: ${assetError.message}`);
        }

        // 3. Generate HTML Table
        const tableRows = assets.map((asset: any, index: number) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${asset.category || "N/A"}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${asset.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${asset.asset_tag}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${asset.serial_number || "-"}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${new Date(asset.updated_at).toLocaleDateString()}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${asset.condition || "-"}</td>
      </tr>
    `).join("");

        const emailHtml = `
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
          <p>Dear ${employee.name},</p>
          <p>Below is the list of company assets currently assigned to you.</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Sr No.</th>
              <th>Asset Type</th>
              <th>Asset Name</th>
              <th>Asset ID</th>
              <th>Serial Number</th>
              <th>Assigned Date</th>
              <th>Condition</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.length > 0 ? tableRows : '<tr><td colspan="7" style="text-align:center;">No assets currently assigned.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <p>If you notice any discrepancy, please contact the IT team immediately.</p>
          <p>Regards,<br>IT Department<br>Asset Compass</p>
        </div>
      </body>
      </html>
    `;

        // 4. Send Email via Resend
        if (!RESEND_API_KEY) {
            console.log("Mocking email send (No API Key found):", emailHtml);
            return new Response(
                JSON.stringify({ message: "Email simulation successful (See logs)", mock: true }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "Asset Compass <onboarding@resend.dev>", // Default Resend sender for testing
                to: [employee.email],
                subject: `Your Assigned Company Assets - Asset Compass`,
                html: emailHtml,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(`Resend API Error: ${JSON.stringify(data)}`);
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
