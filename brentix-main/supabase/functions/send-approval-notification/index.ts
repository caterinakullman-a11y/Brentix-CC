import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  action: "approved" | "rejected";
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send approval notification function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, action, rejectionReason }: NotificationRequest = await req.json();
    console.log(`Processing ${action} notification for user: ${userId}`);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Failed to fetch profile:", profileError);
      throw new Error("User profile not found");
    }

    console.log(`Sending email to: ${profile.email}`);

    const userName = profile.full_name || "Trader";
    const isApproved = action === "approved";

    const subject = isApproved
      ? "🎉 Your Brentix Account Has Been Approved!"
      : "Brentix Account Application Update";

    const htmlContent = isApproved
      ? `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5B9A6F; margin: 0;">BRENTIX</h1>
            <p style="color: #666; margin: 5px 0;">Brent Crude Trading Dashboard</p>
          </div>
          
          <h2 style="color: #333;">Welcome, ${userName}!</h2>
          
          <p style="color: #444; line-height: 1.6;">
            Great news! Your account has been approved by an administrator. 
            You now have full access to the Brentix trading platform.
          </p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #333;">
              <strong>What's next?</strong><br>
              Log in to your account to start trading and monitoring Brent Crude oil signals.
            </p>
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      `
      : `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #9A5B5B; margin: 0;">BRENTIX</h1>
            <p style="color: #666; margin: 5px 0;">Brent Crude Trading Dashboard</p>
          </div>
          
          <h2 style="color: #333;">Account Application Update</h2>
          
          <p style="color: #444; line-height: 1.6;">
            Dear ${userName},
          </p>
          
          <p style="color: #444; line-height: 1.6;">
            We regret to inform you that your account application has not been approved at this time.
          </p>
          
          ${rejectionReason ? `
            <div style="background: #fff5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9A5B5B;">
              <p style="margin: 0; color: #666;">
                <strong>Reason:</strong><br>
                ${rejectionReason}
              </p>
            </div>
          ` : ''}
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you believe this is an error or have questions, please contact our support team.
          </p>
        </div>
      `;

    const emailResponse = await resend.emails.send({
      from: "Brentix <onboarding@resend.dev>",
      to: [profile.email],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-approval-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
