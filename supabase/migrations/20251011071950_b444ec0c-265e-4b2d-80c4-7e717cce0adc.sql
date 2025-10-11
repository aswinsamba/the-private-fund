-- Allow wealth managers to view owner roles and profiles

-- Add policy for wealth managers to view owner roles
CREATE POLICY "Wealth managers can view owner roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'wealth_manager'::app_role) 
  AND role = 'owner'::app_role
);

-- Add policy for wealth managers to view owner profiles
CREATE POLICY "Wealth managers can view owner profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = profiles.id
    AND user_roles.role = 'owner'::app_role
    AND has_role(auth.uid(), 'wealth_manager'::app_role)
  )
);