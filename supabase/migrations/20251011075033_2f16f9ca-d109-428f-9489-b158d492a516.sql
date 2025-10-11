-- Create table to track monthly refresh counts
CREATE TABLE public.monthly_refresh_counts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month_year text NOT NULL UNIQUE,
  refresh_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.monthly_refresh_counts ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view the count
CREATE POLICY "Everyone can view refresh counts"
ON public.monthly_refresh_counts
FOR SELECT
TO authenticated
USING (true);

-- Policy: Service role can manage counts
CREATE POLICY "Service role can manage refresh counts"
ON public.monthly_refresh_counts
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_monthly_refresh_counts_updated_at
BEFORE UPDATE ON public.monthly_refresh_counts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();