-- Create authorized_users table for whitelist management
CREATE TABLE public.authorized_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;

-- Anyone can check if an email is authorized (needed for login)
CREATE POLICY "Anyone can view authorized emails"
ON public.authorized_users
FOR SELECT
USING (true);

-- Only service role can modify (backend only)
CREATE POLICY "Service role can manage authorized users"
ON public.authorized_users
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_authorized_users_updated_at
BEFORE UPDATE ON public.authorized_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial authorized emails
INSERT INTO public.authorized_users (email) VALUES
  ('aswins@gmail.com'),
  ('surotham@gmail.com'),
('aswinspart2@gmail.com'),  
  ('sureshcs.thehindu@gmail.com');

-- Add price_validation column to stock_prices table
ALTER TABLE public.stock_prices
ADD COLUMN price_valid boolean DEFAULT true,
ADD COLUMN validation_note text;

-- Create sell_requests table
CREATE TABLE public.sell_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id uuid NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  requested_by_email text NOT NULL,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.sell_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create sell requests"
ON public.sell_requests
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own sell requests"
ON public.sell_requests
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create suggestions table
CREATE TABLE public.suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_text text NOT NULL,
  suggested_by_email text NOT NULL,
  suggested_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create suggestions"
ON public.suggestions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own suggestions"
ON public.suggestions
FOR SELECT
USING (auth.uid() IS NOT NULL);