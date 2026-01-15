-- Create admin user Amelia Weasley if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.wizards WHERE name = 'Амелия Уизли') THEN
        INSERT INTO public.wizards (name, password, role)
        VALUES ('Амелия Уизли', 'Ams(terdam)', 'admin');
    ELSE
        -- Ensure role is admin if user already exists
        UPDATE public.wizards SET role = 'admin' WHERE name = 'Амелия Уизли';
    END IF;
END $$;
