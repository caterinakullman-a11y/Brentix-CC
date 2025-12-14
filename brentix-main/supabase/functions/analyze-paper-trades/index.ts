import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate JWT and get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch paper trades
    const { data: paperTrades, error: tradesError } = await supabase
      .from("paper_trades")
      .select("*")
      .eq("user_id", userId)
      .order("entry_timestamp", { ascending: false });

    if (tradesError) throw tradesError;

    if (!paperTrades || paperTrades.length === 0) {
      return new Response(
        JSON.stringify({ 
          analysis: "Inga paper trades att analysera ännu.",
          suggestedRules: [] 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user settings
    const { data: settings } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Calculate statistics
    const closedTrades = paperTrades.filter(t => t.status === "CLOSED");
    const winningTrades = closedTrades.filter(t => (t.profit_loss_sek || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.profit_loss_sek || 0) < 0);
    
    const totalPL = closedTrades.reduce((sum, t) => sum + (t.profit_loss_sek || 0), 0);
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + (t.profit_loss_sek || 0), 0) / winningTrades.length 
      : 0;
    const avgLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit_loss_sek || 0), 0) / losingTrades.length)
      : 0;

    // Analyze trades by instrument type
    const bullTrades = closedTrades.filter(t => t.instrument_type === "BULL");
    const bearTrades = closedTrades.filter(t => t.instrument_type === "BEAR");
    
    const bullPL = bullTrades.reduce((sum, t) => sum + (t.profit_loss_sek || 0), 0);
    const bearPL = bearTrades.reduce((sum, t) => sum + (t.profit_loss_sek || 0), 0);

    // Prepare trade summary for AI
    const tradeSummary = {
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: winRate.toFixed(1),
      totalPL: totalPL.toFixed(2),
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      bullTrades: bullTrades.length,
      bearTrades: bearTrades.length,
      bullPL: bullPL.toFixed(2),
      bearPL: bearPL.toFixed(2),
      currentSettings: {
        stopLoss: settings?.stop_loss_percent || 2,
        takeProfit: settings?.take_profit_percent || 1,
        positionSize: settings?.position_size_sek || 1000,
      },
      recentTrades: closedTrades.slice(0, 10).map(t => ({
        direction: t.direction,
        instrument: t.instrument_type,
        entryPrice: t.entry_price,
        exitPrice: t.exit_price,
        pl: t.profit_loss_sek,
        plPercent: t.profit_loss_percent,
      })),
    };

    const prompt = `Du är en erfaren trading-analytiker. Analysera följande paper trading-data och ge konkreta förslag på förbättringar.

TRADING STATISTIK:
- Totalt ${tradeSummary.totalTrades} avslutade trades
- Vinstfrekvens: ${tradeSummary.winRate}%
- Vinnande trades: ${tradeSummary.winningTrades}
- Förlorande trades: ${tradeSummary.losingTrades}
- Total vinst/förlust: ${tradeSummary.totalPL} SEK
- Genomsnittlig vinst: ${tradeSummary.avgWin} SEK
- Genomsnittlig förlust: ${tradeSummary.avgLoss} SEK

INSTRUMENTANALYS:
- BULL trades: ${tradeSummary.bullTrades} st, resultat: ${tradeSummary.bullPL} SEK
- BEAR trades: ${tradeSummary.bearTrades} st, resultat: ${tradeSummary.bearPL} SEK

NUVARANDE INSTÄLLNINGAR:
- Stop-loss: ${tradeSummary.currentSettings.stopLoss}%
- Take-profit: ${tradeSummary.currentSettings.takeProfit}%
- Positionsstorlek: ${tradeSummary.currentSettings.positionSize} SEK

SENASTE TRADES:
${JSON.stringify(tradeSummary.recentTrades, null, 2)}

Ge en analys och föreslå 2-4 konkreta trading-regler som hade kunnat förbättra resultatet. Svara i JSON-format:
{
  "analysis": "Din sammanfattning av trading-prestationen på svenska (2-3 meningar)",
  "keyInsights": ["Insikt 1", "Insikt 2", "Insikt 3"],
  "suggestedRules": [
    {
      "name": "Regelnamn",
      "description": "Beskrivning av regeln",
      "rule_type": "BUY" eller "SELL",
      "conditions": [
        {
          "type": "rsi",
          "operator": "<",
          "value": 30
        }
      ],
      "estimated_improvement_percent": 15,
      "reasoning": "Varför denna regel hade hjälpt"
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Du är en expert på teknisk analys och trading-strategier för råvaror, särskilt Brent Crude Oil. Svara alltid på svenska och i JSON-format." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    let parsedAnalysis;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      parsedAnalysis = JSON.parse(jsonStr);
    } catch {
      parsedAnalysis = {
        analysis: content,
        keyInsights: [],
        suggestedRules: [],
      };
    }

    return new Response(
      JSON.stringify(parsedAnalysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
