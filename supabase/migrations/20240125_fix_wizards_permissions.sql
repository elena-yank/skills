ALTER TABLE public.wizards DISABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.wizards TO anon;
GRANT SELECT ON public.wizards TO authenticated;
GRANT SELECT ON public.wizards TO service_role;
