-- Create the practice_logs table
CREATE TABLE IF NOT EXISTS practice_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE practice_logs ENABLE ROW LEVEL SECURITY;

-- Create Policy for Inserting Logs (Users can insert their own logs)
CREATE POLICY "Users can insert their own practice logs" 
ON practice_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create Policy for Selecting Logs (Users can view their own logs)
CREATE POLICY "Users can view their own practice logs" 
ON practice_logs FOR SELECT 
USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT ALL ON practice_logs TO authenticated;
GRANT SELECT ON practice_logs TO anon;
