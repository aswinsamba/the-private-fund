-- Create table to store daily stock prices
CREATE TABLE public.stock_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  price NUMERIC NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(symbol, date)
);

-- Enable RLS
ALTER TABLE public.stock_prices ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read stock prices
CREATE POLICY "Anyone can view stock prices" 
ON public.stock_prices 
FOR SELECT 
USING (true);

-- Only allow insert from service role (edge functions)
CREATE POLICY "Service role can insert stock prices" 
ON public.stock_prices 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_stock_prices_symbol_date ON public.stock_prices(symbol, date DESC);

-- Create table to track update status
CREATE TABLE public.price_update_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  update_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL,
  error_message TEXT,
  stocks_updated INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.price_update_log ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read update logs
CREATE POLICY "Anyone can view update logs" 
ON public.price_update_log 
FOR SELECT 
USING (true);