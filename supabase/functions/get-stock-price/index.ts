import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol } = await req.json();
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('MARKETSTACK_API_KEY');
    
    if (!apiKey) {
      console.error('MARKETSTACK_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch latest price from marketstack
    const url = `http://api.marketstack.com/v1/eod/latest?access_key=${apiKey}&symbols=${symbol}.NSE`;
    
    console.log('Fetching stock data for:', symbol);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Marketstack API error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch stock data', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data.data || data.data.length === 0) {
      console.error('No data returned for symbol:', symbol);
      return new Response(
        JSON.stringify({ error: 'Stock data not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stockData = data.data[0];
    
    return new Response(
      JSON.stringify({
        symbol: stockData.symbol,
        price: stockData.close,
        date: stockData.date
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-stock-price function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
