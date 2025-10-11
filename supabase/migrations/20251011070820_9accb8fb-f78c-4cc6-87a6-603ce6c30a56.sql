-- Fix authorized_users table security
DROP POLICY IF EXISTS "Anyone can view authorized emails" ON public.authorized_users;

CREATE POLICY "Only owners can view authorized emails"
ON public.authorized_users
FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Only owners can manage authorized emails"
ON public.authorized_users
FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- Fix sell_requests table security
DROP POLICY IF EXISTS "Users can view their own sell requests" ON public.sell_requests;

CREATE POLICY "Users can view relevant sell requests"
ON public.sell_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stocks
    WHERE stocks.id = sell_requests.stock_id
    AND stocks.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'wealth_manager'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
);

-- Fix suggestions table security
DROP POLICY IF EXISTS "Users can view their own suggestions" ON public.suggestions;

CREATE POLICY "Only owners can view suggestions"
ON public.suggestions
FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));

-- Ensure nse_symbols is restricted properly
DROP POLICY IF EXISTS "Anyone can view NSE symbols" ON public.nse_symbols;

CREATE POLICY "Authenticated users can view NSE symbols"
ON public.nse_symbols
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Ensure price_update_log is restricted properly
DROP POLICY IF EXISTS "Anyone can view update logs" ON public.price_update_log;

CREATE POLICY "Authenticated users can view update logs"
ON public.price_update_log
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Ensure stock_prices is restricted properly
DROP POLICY IF EXISTS "Anyone can view stock prices" ON public.stock_prices;

CREATE POLICY "Authenticated users can view stock prices"
ON public.stock_prices
FOR SELECT
USING (auth.uid() IS NOT NULL);