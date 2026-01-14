CREATE TABLE IF NOT EXISTS public.wizards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.practice_logs DROP CONSTRAINT IF EXISTS practice_logs_user_id_fkey;

ALTER TABLE public.practice_logs 
ADD CONSTRAINT practice_logs_wizard_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.wizards(id);
