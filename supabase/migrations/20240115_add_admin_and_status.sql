-- Add role to wizards
ALTER TABLE public.wizards ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Insert Amelia Weasley
INSERT INTO public.wizards (name, password, role)
VALUES ('Амелия Уизли', 'Ams(terdam)', 'admin')
ON CONFLICT (name) DO UPDATE SET role = 'admin', password = 'Ams(terdam)';

-- Add status to practice_logs
ALTER TABLE public.practice_logs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Add check constraint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'practice_logs_status_check') THEN
        ALTER TABLE public.practice_logs ADD CONSTRAINT practice_logs_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- Update existing logs to approved so users don't lose progress
-- We assume any log created before this migration runs (or just all existing ones) are approved
UPDATE public.practice_logs SET status = 'approved' WHERE status = 'pending';
