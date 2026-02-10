-- Add study_completed to status check constraint
ALTER TABLE public.practice_logs DROP CONSTRAINT IF EXISTS practice_logs_status_check;

ALTER TABLE public.practice_logs 
ADD CONSTRAINT practice_logs_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'exam_passed', 'study_completed'));
