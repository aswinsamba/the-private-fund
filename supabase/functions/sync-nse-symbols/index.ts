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

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables');
    return new Response(
      JSON.stringify({ error: 'Configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Fetching NSE equity list...');
    
    // Fetch NSE equity list CSV from archives
    const nseUrl = 'https://archives.nseindia.com/content/equities/EQUITY_L.csv';
    const response = await fetch(nseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/csv,application/csv',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch NSE data: ${response.statusText}`);
    }

    const csvText = await response.text();
    console.log('CSV data fetched successfully');

    // Parse CSV (skip header row)
    const lines = csvText.trim().split('\n');
    const symbols = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // CSV format: SYMBOL, NAME OF COMPANY, SERIES, DATE OF LISTING, PAID UP VALUE, MARKET LOT, ISIN NUMBER, FACE VALUE
      const parts = line.split(',');
      
      if (parts.length >= 7) {
        const symbol = parts[0]?.trim().replace(/"/g, '');
        const companyName = parts[1]?.trim().replace(/"/g, '');
        const series = parts[2]?.trim().replace(/"/g, '');
        const isin = parts[6]?.trim().replace(/"/g, '');

        if (symbol && companyName) {
          symbols.push({
            symbol,
            company_name: companyName,
            series,
            isin: isin || null,
          });
        }
      }
    }

    console.log(`Parsed ${symbols.length} symbols from CSV`);

    // Upsert symbols in batches
    const batchSize = 500;
    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('nse_symbols')
        .upsert(batch, { 
          onConflict: 'symbol',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`Error upserting batch ${i / batchSize + 1}:`, error);
      } else {
        inserted += batch.length;
        console.log(`Processed batch ${i / batchSize + 1}/${Math.ceil(symbols.length / batchSize)}`);
      }
    }

    console.log(`Sync complete: ${inserted} symbols processed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        symbolsProcessed: symbols.length,
        message: `Successfully synced ${symbols.length} NSE symbols`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-nse-symbols function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
