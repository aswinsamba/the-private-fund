-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('owner', 'wealth_manager');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user roles"
  ON public.user_roles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Update RLS policies on stocks table to allow wealth managers to view owner's stocks
DROP POLICY IF EXISTS "Users can view their own stocks" ON public.stocks;

CREATE POLICY "Users can view stocks based on role"
  ON public.stocks
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'wealth_manager')
  );

-- Update RLS policies on stocks table to only allow owners to insert
CREATE POLICY "Only owners can insert stocks"
  ON public.stocks
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Update RLS policies on stocks table to only allow owners to delete
DROP POLICY IF EXISTS "Users can delete their own stocks" ON public.stocks;

CREATE POLICY "Only owners can delete stocks"
  ON public.stocks
  FOR DELETE
  USING (
    auth.uid() = user_id AND 
    public.has_role(auth.uid(), 'owner')
  );

-- Update RLS policies on watchlist to allow wealth managers to view
DROP POLICY IF EXISTS "Users can view their own watchlist" ON public.watchlist;

CREATE POLICY "Users can view watchlist based on role"
  ON public.watchlist
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'wealth_manager')
  );

-- Update RLS policies on watchlist to only allow owners to insert/delete
DROP POLICY IF EXISTS "Users can insert their own watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users can delete their own watchlist" ON public.watchlist;

CREATE POLICY "Only owners can insert watchlist"
  ON public.watchlist
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Only owners can delete watchlist"
  ON public.watchlist
  FOR DELETE
  USING (
    auth.uid() = user_id AND 
    public.has_role(auth.uid(), 'owner')
  );

-- Update RLS on sell_requests to allow service role
DROP POLICY IF EXISTS "Users can create sell requests" ON public.sell_requests;

CREATE POLICY "Service role can create sell requests"
  ON public.sell_requests
  FOR INSERT
  WITH CHECK (true);

-- Update RLS on suggestions to allow service role
DROP POLICY IF EXISTS "Users can create suggestions" ON public.suggestions;

CREATE POLICY "Service role can create suggestions"
  ON public.suggestions
  FOR INSERT
  WITH CHECK (true);

-- Populate user_roles based on existing profiles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'owner'::app_role
FROM public.profiles
WHERE email = 'aswins@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'wealth_manager'::app_role
FROM public.profiles
WHERE email IN ('surotham@gmail.com', 'sureshcs.thehindu@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;