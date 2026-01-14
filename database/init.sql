-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create wizards table (Custom Auth)
CREATE TABLE IF NOT EXISTS public.wizards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create practice_logs table
CREATE TABLE IF NOT EXISTS public.practice_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.wizards(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    post_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wizards_name ON public.wizards(name);
CREATE INDEX IF NOT EXISTS idx_practice_logs_user_id ON public.practice_logs(user_id);
