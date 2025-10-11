import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const suggestionSchema = z.object({
  suggestionText: z.string().min(1).max(2000).trim(),
  suggestedByEmail: z.string().email().max(255),
});

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

    const requestBody = await req.json();
    
    // Validate input
    const validationResult = suggestionSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input data" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { suggestionText, suggestedByEmail } = validationResult.data;

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
      return new Response(
        JSON.stringify({ error: "Failed to record suggestion" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
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
          <p style="background: #f4f4f4; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${suggestionText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          
          <h2>Suggested By:</h2>
          <p>${suggestedByEmail.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          
          <p>Please review this suggestion for potential inclusion in the portfolio.</p>
          
          <p>Best regards,<br>The Private Fund System</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      console.error("Email API error:", await emailResponse.text());
      return new Response(
        JSON.stringify({ error: "Failed to send email notification" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
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
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
