import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { symbols } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const validationResults = await Promise.all(
      symbols.map(async (symbol: string) => {
        try {
          // Get current price from database
          const { data: dbPrice } = await supabase
            .from('stock_prices')
            .select('price')
            .eq('symbol', symbol)
            .order('date', { ascending: false })
            .limit(1)
            .single()

          if (!dbPrice) {
            return { symbol, hasDiscrepancy: false, dbPrice: null, webPrice: null }
          }

          // Search for real-time price using web search
          const searchQuery = `${symbol} NSE stock price india live`
          const searchResponse = await fetch(
            `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            }
          )

          const html = await searchResponse.text()
          
          // Try to extract price from Google's knowledge graph
          // This is a simple pattern match - real implementation would be more robust
          const priceMatch = html.match(/₹[\d,]+\.?\d*/g)
          if (!priceMatch) {
            return { symbol, hasDiscrepancy: false, dbPrice: parseFloat(dbPrice.price), webPrice: null }
          }

          const webPriceStr = priceMatch[0].replace('₹', '').replace(/,/g, '')
          const webPrice = parseFloat(webPriceStr)
          
          const dbPriceNum = parseFloat(dbPrice.price)
          const discrepancyPercent = Math.abs((webPrice - dbPriceNum) / dbPriceNum) * 100

          // Flag if discrepancy is > 5%
          const hasDiscrepancy = discrepancyPercent > 5

          return {
            symbol,
            hasDiscrepancy,
            dbPrice: dbPriceNum,
            webPrice,
            discrepancyPercent: Math.round(discrepancyPercent * 100) / 100
          }
        } catch (error) {
          console.error(`Error validating ${symbol}:`, error)
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          return { symbol, hasDiscrepancy: false, dbPrice: null, webPrice: null, error: errorMsg }
        }
      })
    )

    return new Response(
      JSON.stringify({ validationResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in validate-stock-prices:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
