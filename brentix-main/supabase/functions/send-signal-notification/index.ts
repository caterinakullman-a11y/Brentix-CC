import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignalNotificationRequest {
  signalId: string;
  signalType: "BUY" | "SELL" | "HOLD";
  strength: "STRONG" | "MODERATE" | "WEAK";
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  confidence: number;
  reasoning: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send signal notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signal: SignalNotificationRequest = await req.json();
    console.log(`Processing ${signal.signalType} signal notification (${signal.strength})`);

    // Only send notifications for STRONG signals
    if (signal.strength !== "STRONG") {
      console.log("Skipping notification for non-STRONG signal");
      return new Response(
        JSON.stringify({ success: true, message: "Notification skipped for non-STRONG signal" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all approved users with email notifications enabled
    const { data: usersWithSettings, error: settingsError } = await supabase
      .from("user_settings")
      .select(`
        user_id,
        enable_email_notifications,
        notify_new_signals
      `)
      .eq("enable_email_notifications", true)
      .eq("notify_new_signals", true);

    if (settingsError) {
      console.error("Failed to fetch user settings:", settingsError);
      throw settingsError;
    }

    if (!usersWithSettings || usersWithSettings.length === 0) {
      console.log("No users with email notifications enabled");
      return new Response(
        JSON.stringify({ success: true, message: "No users to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user profiles for those with notifications enabled
    const userIds = usersWithSettings.map(u => u.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name, status")
      .in("id", userIds)
      .eq("status", "approved");

    if (profilesError) {
      console.error("Failed to fetch profiles:", profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log("No approved users to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No approved users to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending notifications to ${profiles.length} users`);

    const signalEmoji = signal.signalType === "BUY" ? "🟢" : signal.signalType === "SELL" ? "🔴" : "🟡";
    const signalColor = signal.signalType === "BUY" ? "#22c55e" : signal.signalType === "SELL" ? "#ef4444" : "#eab308";
    const signalText = signal.signalType === "BUY" ? "KÖP" : signal.signalType === "SELL" ? "SÄLJ" : "HÅLL";

    // Send emails and create in-app notifications
    const results = await Promise.allSettled(
      profiles.map(async (profile) => {
        // Create in-app notification
        await supabase.from("notifications").insert({
          user_id: profile.id,
          type: "signal",
          title: `${signalEmoji} STARK ${signalText}-signal`,
          message: `${signal.reasoning}. Pris: $${signal.currentPrice.toFixed(2)}, Mål: $${signal.targetPrice.toFixed(2)}`,
          data: {
            signalId: signal.signalId,
            signalType: signal.signalType,
            strength: signal.strength,
            price: signal.currentPrice,
          },
        });

        // Send email
        const emailResponse = await resend.emails.send({
          from: "Brentix Signals <onboarding@resend.dev>",
          to: [profile.email],
          subject: `${signalEmoji} STARK ${signalText}-signal - Brentix`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #22c55e; margin: 0;">BRENTIX</h1>
                <p style="color: #888; margin: 5px 0;">Trading Signal Alert</p>
              </div>

              <div style="background: #16213e; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="font-size: 48px;">${signalEmoji}</span>
                  <h2 style="color: ${signalColor}; margin: 10px 0; font-size: 28px;">STARK ${signalText}-SIGNAL</h2>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                  <div style="background: #0f172a; padding: 16px; border-radius: 8px; text-align: center;">
                    <p style="color: #888; margin: 0 0 5px 0; font-size: 12px;">AKTUELLT PRIS</p>
                    <p style="color: #fff; margin: 0; font-size: 24px; font-weight: bold;">$${signal.currentPrice.toFixed(2)}</p>
                  </div>
                  <div style="background: #0f172a; padding: 16px; border-radius: 8px; text-align: center;">
                    <p style="color: #888; margin: 0 0 5px 0; font-size: 12px;">KONFIDENS</p>
                    <p style="color: #22c55e; margin: 0; font-size: 24px; font-weight: bold;">${signal.confidence.toFixed(0)}%</p>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                  <div style="background: #0f172a; padding: 16px; border-radius: 8px; text-align: center;">
                    <p style="color: #888; margin: 0 0 5px 0; font-size: 12px;">MÅLPRIS</p>
                    <p style="color: #22c55e; margin: 0; font-size: 18px;">$${signal.targetPrice.toFixed(2)}</p>
                  </div>
                  <div style="background: #0f172a; padding: 16px; border-radius: 8px; text-align: center;">
                    <p style="color: #888; margin: 0 0 5px 0; font-size: 12px;">STOP LOSS</p>
                    <p style="color: #ef4444; margin: 0; font-size: 18px;">$${signal.stopLoss.toFixed(2)}</p>
                  </div>
                </div>

                <div style="background: #0f172a; padding: 16px; border-radius: 8px;">
                  <p style="color: #888; margin: 0 0 8px 0; font-size: 12px;">ANALYS</p>
                  <p style="color: #fff; margin: 0; line-height: 1.5;">${signal.reasoning}</p>
                </div>
              </div>

              <p style="color: #666; font-size: 11px; text-align: center; margin-top: 30px;">
                Detta är en automatisk notifikation från Brentix.
                Du kan ändra dina notifikationsinställningar i appen.
              </p>
            </div>
          `,
        });

        return { userId: profile.id, email: profile.email, emailResponse };
      })
    );

    const successful = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    console.log(`Notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ success: true, sent: successful, failed }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-signal-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
