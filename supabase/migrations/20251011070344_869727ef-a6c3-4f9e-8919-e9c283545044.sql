-- First, clear existing role assignments for these users
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT id FROM public.profiles
  WHERE email IN ('aswins@gmail.com', 'surotham@gmail.com', 'aswinspart2@gmail.com', 'sureshcs.thehindu@gmail.com')
);

-- Set aswins@gmail.com as owner
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'owner'::app_role
FROM public.profiles
WHERE email = 'aswins@gmail.com';

-- Set wealth managers
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'wealth_manager'::app_role
FROM public.profiles
WHERE email IN ('surotham@gmail.com', 'aswinspart2@gmail.com', 'sureshcs.thehindu@gmail.com');