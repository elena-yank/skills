ALTER TABLE public.practice_logs DROP CONSTRAINT IF EXISTS practice_logs_wizard_id_fkey;

ALTER TABLE public.practice_logs
ADD CONSTRAINT practice_logs_wizard_id_fkey
FOREIGN KEY (user_id) REFERENCES public.wizards(id)
ON DELETE CASCADE;
