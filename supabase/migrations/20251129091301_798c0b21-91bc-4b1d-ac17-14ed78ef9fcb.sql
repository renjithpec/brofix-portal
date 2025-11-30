-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'admin');

-- Create profiles table (Added contact_number)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  branch TEXT NOT NULL CHECK (branch IN ('Bengaluru', 'Calicut', 'Chennai', 'Coimbatore', 'Kochi', 'Trivandrum')),
  contact_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('WiFi', 'Food', 'Cleanliness', 'Academics', 'Other')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In_Progress', 'Resolved')),
  branch TEXT NOT NULL CHECK (branch IN ('Bengaluru', 'Calicut', 'Chennai', 'Coimbatore', 'Kochi', 'Trivandrum')),
  image_url TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_comment TEXT,
  admin_remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, complaint_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('status_change', 'new_complaint', 'review_received')),
  message TEXT NOT NULL,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role)
$$;

-- Security definer function to get user branch
CREATE OR REPLACE FUNCTION public.get_user_branch(_user_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT branch FROM public.profiles WHERE id = _user_id
$$;

-- Profiles RLS Policies
CREATE POLICY "Users can view profiles in their branch" ON public.profiles FOR SELECT TO authenticated
USING (branch = public.get_user_branch(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Complaints RLS Policies
CREATE POLICY "Users can view complaints in their branch" ON public.complaints FOR SELECT TO authenticated
USING (branch = public.get_user_branch(auth.uid()));

CREATE POLICY "Users can create complaints in their branch" ON public.complaints FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND branch = public.get_user_branch(auth.uid()));

CREATE POLICY "Users can update their own complaints" ON public.complaints FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Votes RLS Policies
CREATE POLICY "Users can view all votes in their branch complaints" ON public.votes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_id AND c.branch = public.get_user_branch(auth.uid())));

CREATE POLICY "Users can insert their own votes" ON public.votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own votes" ON public.votes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own votes" ON public.votes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Notifications RLS Policies
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Authenticated users can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SECURE USER SIGNUP TRIGGER (Forces Admin Role & Branch)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assigned_role app_role;
  assigned_branch text;
BEGIN
  -- Security: Force Admin Role for specific emails
  IF NEW.email IN ('admin.kochi@brototype.com', 'admin.blr@brototype.com', 'admin.clt@brototype.com', 'admin.chn@brototype.com', 'admin.cbe@brototype.com', 'admin.tvm@brototype.com') THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'student';
  END IF;

  -- Logic: Force correct branch for Admins
  IF NEW.email = 'admin.kochi@brototype.com' THEN assigned_branch := 'Kochi';
  ELSIF NEW.email = 'admin.blr@brototype.com' THEN assigned_branch := 'Bengaluru';
  ELSIF NEW.email = 'admin.clt@brototype.com' THEN assigned_branch := 'Calicut';
  ELSIF NEW.email = 'admin.chn@brototype.com' THEN assigned_branch := 'Chennai';
  ELSIF NEW.email = 'admin.cbe@brototype.com' THEN assigned_branch := 'Coimbatore';
  ELSIF NEW.email = 'admin.tvm@brototype.com' THEN assigned_branch := 'Trivandrum';
  ELSE
    assigned_branch := COALESCE(NEW.raw_user_meta_data ->> 'branch', 'Kochi');
  END IF;

  INSERT INTO public.profiles (id, email, full_name, branch, role, contact_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    assigned_branch,
    assigned_role,
    COALESCE(NEW.raw_user_meta_data ->> 'contact_number', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage Setup
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true), ('complaint-images', 'complaint-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Complaint images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'complaint-images');
CREATE POLICY "Authenticated users can upload complaint images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'complaint-images' AND auth.role() = 'authenticated');

ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- MANUAL FIX: Ensure admins have the correct role if the trigger failed previously
UPDATE public.profiles 
SET role = 'admin' 
WHERE email IN (
  'admin.kochi@brototype.com', 
  'admin.blr@brototype.com', 
  'admin.clt@brototype.com', 
  'admin.chn@brototype.com', 
  'admin.cbe@brototype.com', 
  'admin.tvm@brototype.com'
);
