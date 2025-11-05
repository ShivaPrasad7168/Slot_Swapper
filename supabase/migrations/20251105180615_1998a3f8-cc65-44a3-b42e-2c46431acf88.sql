-- Fix swap_requests to reference profiles instead of auth.users

-- Drop existing foreign key constraints (in case they reference auth.users)
ALTER TABLE public.swap_requests 
  DROP CONSTRAINT IF EXISTS swap_requests_requester_id_fkey,
  DROP CONSTRAINT IF EXISTS swap_requests_target_user_id_fkey;

-- Add correct foreign keys pointing to profiles(id)
ALTER TABLE public.swap_requests
  ADD CONSTRAINT swap_requests_requester_id_fkey 
    FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT swap_requests_target_user_id_fkey 
    FOREIGN KEY (target_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
