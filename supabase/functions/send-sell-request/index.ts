import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SellRequestBody {
  stockId: string;
  symbol: string;
  quantity: number;
  requestedByEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { stockId, symbol, quantity, requestedByEmail }: SellRequestBody = await req.json();

    console.log("Processing sell request:", { stockId, symbol, quantity, requestedByEmail });

    // Record the sell request
    const { error: dbError } = await supabaseClient
      .from("sell_requests")
      .insert({
        stock_id: stockId,
        requested_by_email: requestedByEmail,
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw dbError;
    }

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      },
      body: JSON.stringify({
        from: "The Private Fund <onboarding@resend.dev>",
        to: ["aswins@gmail.com"],
        subject: "Sell Request Notification",
        html: `
          <h1>Stock Sell Request</h1>
          <p>A user has requested to sell a stock from The Private Fund portfolio.</p>
          
          <h2>Stock Details:</h2>
          <ul>
            <li><strong>Symbol:</strong> ${symbol}</li>
            <li><strong>Quantity:</strong> ${quantity}</li>
          </ul>
          
          <h2>Requested By:</h2>
          <p>${requestedByEmail}</p>
          
          <p>Please review and process this sell request.</p>
          
          <p>Best regards,<br>The Private Fund System</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error(`Email API error: ${await emailResponse.text()}`);
    }

    console.log("Email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-sell-request function:", error);
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
