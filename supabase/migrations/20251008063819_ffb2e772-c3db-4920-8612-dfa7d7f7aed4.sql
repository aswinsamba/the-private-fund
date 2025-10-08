-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create nse_symbols table for master list of NSE stocks
CREATE TABLE public.nse_symbols (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL UNIQUE,
  company_name text NOT NULL,
  series text,
  isin text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on nse_symbols
ALTER TABLE public.nse_symbols ENABLE ROW LEVEL SECURITY;

-- Anyone can view NSE symbols (public read access)
CREATE POLICY "Anyone can view NSE symbols"
ON public.nse_symbols
FOR SELECT
USING (true);

-- Only service role can insert/update NSE symbols
CREATE POLICY "Service role can insert NSE symbols"
ON public.nse_symbols
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update NSE symbols"
ON public.nse_symbols
FOR UPDATE
USING (true);

-- Create watchlist table for user's watchlist stocks
CREATE TABLE public.watchlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, symbol)
);

-- Enable RLS on watchlist
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- Users can view their own watchlist
CREATE POLICY "Users can view their own watchlist"
ON public.watchlist
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own watchlist items
CREATE POLICY "Users can insert their own watchlist"
ON public.watchlist
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own watchlist items
CREATE POLICY "Users can delete their own watchlist"
ON public.watchlist
FOR DELETE
USING (auth.uid() = user_id);

-- Create index on symbol for faster lookups
CREATE INDEX idx_nse_symbols_symbol ON public.nse_symbols(symbol);
CREATE INDEX idx_watchlist_user_id ON public.watchlist(user_id);
CREATE INDEX idx_watchlist_symbol ON public.watchlist(symbol);

-- Create trigger for automatic timestamp updates on nse_symbols
CREATE TRIGGER update_nse_symbols_updated_at
BEFORE UPDATE ON public.nse_symbols
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();