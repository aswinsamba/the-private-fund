import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const apiKey = Deno.env.get('MARKETSTACK_API_KEY');

  if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables');
    return new Response(
      JSON.stringify({ error: 'Configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  let stocksUpdated = 0;
  let errorMessage = null;

  try {
    // Get all unique stock symbols from the stocks table
    const { data: stocks, error: stocksError } = await supabase
      .from('stocks')
      .select('symbol');

    if (stocksError) throw stocksError;

    // Get all unique symbols from the watchlist table
    const { data: watchlist, error: watchlistError } = await supabase
      .from('watchlist')
      .select('symbol');

    if (watchlistError) throw watchlistError;

    // Combine and deduplicate symbols from both tables
    const stockSymbols = stocks?.map(s => s.symbol) || [];
    const watchlistSymbols = watchlist?.map(w => w.symbol) || [];
    const uniqueSymbols = [...new Set([...stockSymbols, ...watchlistSymbols])];
    
    console.log(`Updating prices for ${uniqueSymbols.length} symbols (${stockSymbols.length} from portfolio, ${watchlistSymbols.length} from watchlist)`);

    const today = new Date().toISOString().split('T')[0];

    for (const symbol of uniqueSymbols) {
      try {
        // Add .XNSE suffix for NSE stocks
        const marketstackSymbol = `${symbol}.XNSE`;
        
        // Fetch from Marketstack API
        const url = `http://api.marketstack.com/v1/eod/latest?access_key=${apiKey}&symbols=${marketstackSymbol}`;
        console.log('Fetching stock data for:', marketstackSymbol);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok || !data.data || data.data.length === 0) {
          console.error(`Failed to fetch price for ${symbol}:`, data);
          continue;
        }

        const stockData = data.data[0];
        const price = stockData.close;

        // Store the price in database
        const { error: upsertError } = await supabase
          .from('stock_prices')
          .upsert({
            symbol: symbol,
            price: price,
            date: today
          }, { onConflict: 'symbol,date' });

        if (upsertError) {
          console.error(`Error storing price for ${symbol}:`, upsertError);
        } else {
          stocksUpdated++;
        }
      } catch (err) {
        console.error(`Error processing ${symbol}:`, err);
      }
    }

    // Log the update
    await supabase
      .from('price_update_log')
      .insert({
        status: stocksUpdated > 0 ? 'success' : 'partial_failure',
        stocks_updated: stocksUpdated,
        error_message: stocksUpdated === 0 ? 'No stocks updated' : null
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        stocksUpdated,
        message: `Updated ${stocksUpdated} out of ${uniqueSymbols.length} stocks`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-stock-prices function:', error);
    errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Log the failure
    await supabase
      .from('price_update_log')
      .insert({
        status: 'failure',
        stocks_updated: stocksUpdated,
        error_message: errorMessage
      });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
