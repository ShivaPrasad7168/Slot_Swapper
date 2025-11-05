-- Create enum for event status
CREATE TYPE event_status AS ENUM ('BUSY', 'SWAPPABLE', 'SWAP_PENDING');

-- Create enum for swap request status
CREATE TYPE swap_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status event_status NOT NULL DEFAULT 'BUSY',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Users can view their own events"
  ON public.events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view swappable events from others"
  ON public.events FOR SELECT
  USING (status IN ('SWAPPABLE', 'SWAP_PENDING'));

CREATE POLICY "Users can insert their own events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to perform swap operation with proper permissions
CREATE OR REPLACE FUNCTION public.perform_swap(
  p_requester_slot_id UUID,
  p_target_slot_id UUID,
  p_requester_id UUID,
  p_target_user_id UUID,
  p_request_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update requester's slot to target user
  UPDATE public.events
  SET user_id = p_target_user_id, status = 'BUSY'
  WHERE id = p_requester_slot_id;

  -- Update target's slot to requester
  UPDATE public.events
  SET user_id = p_requester_id, status = 'BUSY'
  WHERE id = p_target_slot_id;

  -- Update swap request status
  UPDATE public.swap_requests
  SET status = 'ACCEPTED'
  WHERE id = p_request_id;
END;
$$;

-- Function to reject swap
CREATE OR REPLACE FUNCTION public.reject_swap(
  p_requester_slot_id UUID,
  p_target_slot_id UUID,
  p_request_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reset slots to swappable
  UPDATE public.events
  SET status = 'SWAPPABLE'
  WHERE id IN (p_requester_slot_id, p_target_slot_id);

  -- Update swap request status
  UPDATE public.swap_requests
  SET status = 'REJECTED'
  WHERE id = p_request_id;
END;
$$;

CREATE POLICY "Users can delete their own events"
  ON public.events FOR DELETE
  USING (auth.uid() = user_id);

-- Create swap_requests table
CREATE TABLE public.swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_slot_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  target_slot_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status swap_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on swap_requests
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;

-- Swap requests policies
CREATE POLICY "Users can view swap requests they're involved in"
  ON public.swap_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can create swap requests"
  ON public.swap_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Target users can update swap requests"
  ON public.swap_requests FOR UPDATE
  USING (auth.uid() = target_user_id);

-- ✅ FIXED FUNCTION: safer profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'User'
    ),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_swap_requests_updated_at
  BEFORE UPDATE ON public.swap_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
