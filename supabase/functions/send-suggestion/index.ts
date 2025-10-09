import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SuggestionBody {
  suggestionText: string;
  suggestedByEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { suggestionText, suggestedByEmail }: SuggestionBody = await req.json();

    console.log("Processing suggestion:", { suggestedByEmail });

    // Record the suggestion
    const { error: dbError } = await supabaseClient
      .from("suggestions")
      .insert({
        suggestion_text: suggestionText,
        suggested_by_email: suggestedByEmail,
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
        subject: "New Stock Suggestion",
        html: `
          <h1>New Stock Suggestion</h1>
          <p>A user has submitted a new stock suggestion for The Private Fund.</p>
          
          <h2>Suggestion:</h2>
          <p style="background: #f4f4f4; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${suggestionText}</p>
          
          <h2>Suggested By:</h2>
          <p>${suggestedByEmail}</p>
          
          <p>Please review this suggestion for potential inclusion in the portfolio.</p>
          
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
    console.error("Error in send-suggestion function:", error);
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
