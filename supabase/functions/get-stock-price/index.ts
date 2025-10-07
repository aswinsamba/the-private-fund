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
    const { symbol, symbols } = await req.json();
    
    if (!symbol && (!symbols || symbols.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Symbol or symbols array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('MARKETSTACK_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!apiKey) {
      console.error('MARKETSTACK_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const stockSymbols = symbols || [symbol];
    const results = [];

    for (const sym of stockSymbols) {
      try {
        // Check if we have a recent price in the database (today's price)
        const today = new Date().toISOString().split('T')[0];
        const { data: existingPrice } = await supabase
          .from('stock_prices')
          .select('*')
          .eq('symbol', sym)
          .eq('date', today)
          .single();

        if (existingPrice) {
          console.log(`Using cached price for ${sym}`);
          results.push({
            symbol: sym,
            price: parseFloat(existingPrice.price),
            date: existingPrice.date,
            cached: true
          });
          continue;
        }

        // Fetch from Marketstack API
        const url = `http://api.marketstack.com/v1/eod/latest?access_key=${apiKey}&symbols=${sym}`;
        console.log('Fetching stock data for:', sym);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok || !data.data || data.data.length === 0) {
          console.error(`Failed to fetch price for ${sym}:`, data);
          results.push({ symbol: sym, error: 'Failed to fetch price' });
          continue;
        }

        const stockData = data.data[0];
        const price = stockData.close;
        const date = stockData.date.split('T')[0];

        // Store the price in database
        await supabase
          .from('stock_prices')
          .upsert({
            symbol: sym,
            price: price,
            date: date
          }, { onConflict: 'symbol,date' });

        results.push({
          symbol: sym,
          price: price,
          date: date,
          cached: false
        });
      } catch (err) {
        console.error(`Error processing ${sym}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.push({ symbol: sym, error: errorMessage });
      }
    }

    // Return single result or array based on input
    const responseData = symbol ? results[0] : results;
    
    return new Response(
      JSON.stringify(responseData),
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
