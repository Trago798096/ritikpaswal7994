-- Add notification settings columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT false;

-- Update existing profiles to have default notification settings
UPDATE public.profiles
SET 
  email_notifications = false,
  push_notifications = false,
  sms_notifications = false
WHERE email_notifications IS NULL
  OR push_notifications IS NULL
  OR sms_notifications IS NULL; 