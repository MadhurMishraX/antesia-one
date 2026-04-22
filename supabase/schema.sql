-- ANTESIA SQL Foundation
-- Comprehensive script for Supabase SQL Editor

-- 1. Enums
CREATE TYPE user_role AS ENUM ('teacher', 'student', 'admin');
CREATE TYPE module_priority AS ENUM ('Crucial', 'Vital', 'Foundational', 'Supporting');
CREATE TYPE question_type AS ENUM ('MCQ', 'text_answer');
CREATE TYPE submission_status AS ENUM ('not_started', 'in_progress', 'submitted', 'missed');
CREATE TYPE answer_status AS ENUM ('answered', 'skipped', 'not_visited');
CREATE TYPE league_tier AS ENUM ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond');
CREATE TYPE doubt_status AS ENUM ('open', 'resolved');
CREATE TYPE notification_type AS ENUM ('broadcast', 'xp_gain', 'due_date_reminder', 'doubt_reply');
CREATE TYPE deep_link_target AS ENUM ('broadcast_history', 'dashboard', 'study_vault', 'doubt_detail');

-- 2. Tables

-- users table (extending auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'student',
    login_id VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    profile_photo_url TEXT,
    is_anonymous_on_leaderboard BOOLEAN NOT NULL DEFAULT FALSE,
    push_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    dark_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    subject VARCHAR(100), -- Teacher only
    last_seen_at TIMESTAMPTZ,
    last_location VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- admin_security_logs table
CREATE TABLE public.admin_security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint TEXT NOT NULL,
    user_agent TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'fail')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- admin_trusted_devices table
CREATE TABLE public.admin_trusted_devices (
    fingerprint TEXT PRIMARY KEY,
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- modules table
CREATE TABLE public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    module_name VARCHAR(300) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    priority module_priority NOT NULL,
    xp_reward INTEGER NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- questions table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_type question_type NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB, -- Array of { option_id, option_text, is_correct }
    correct_answer_text TEXT,
    explanation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- assignment_submissions table
CREATE TABLE public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status submission_status NOT NULL DEFAULT 'not_started',
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    time_taken_seconds INTEGER,
    score INTEGER,
    total_questions INTEGER NOT NULL,
    xp_earned INTEGER,
    is_auto_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(student_id, module_id)
);

-- submission_answers table
CREATE TABLE public.submission_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id),
    question_number INTEGER NOT NULL,
    answer_status answer_status NOT NULL DEFAULT 'not_visited',
    selected_option_id UUID,
    text_answer TEXT,
    student_answer TEXT,
    is_correct BOOLEAN,
    approval_status TEXT CHECK (approval_status IN ('approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(submission_id, question_id)
);

-- student_stats table
CREATE TABLE public.student_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_xp INTEGER NOT NULL DEFAULT 0,
    current_streak_days INTEGER NOT NULL DEFAULT 0,
    longest_streak_days INTEGER NOT NULL DEFAULT 0,
    last_submission_date DATE,
    current_league league_tier NOT NULL DEFAULT 'Bronze',
    xp_in_current_league INTEGER NOT NULL DEFAULT 0,
    global_rank INTEGER,
    accuracy_all_time NUMERIC(5,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- broadcasts table
CREATE TABLE public.broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id),
    message_text TEXT NOT NULL,
    is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- doubts table
CREATE TABLE public.doubts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    module_id UUID REFERENCES public.modules(id),
    question_id UUID REFERENCES public.questions(id),
    doubt_text TEXT NOT NULL,
    pre_filled_context TEXT,
    attachment_url TEXT,
    status doubt_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- doubt_replies table
CREATE TABLE public.doubt_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doubt_id UUID NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id),
    reply_text TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(300) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    deep_link_target deep_link_target NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Row Level Security (RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubt_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_trusted_devices ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin without recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can read all profiles (for leaderboard), but only update their own.
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can do everything on profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- Modules: Students can read published modules. Teachers can read all and manage their own.
CREATE POLICY "Students can view published modules" ON public.modules FOR SELECT USING (is_published = true);
CREATE POLICY "Teachers can manage their own modules" ON public.modules FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Admins can do everything on modules" ON public.modules FOR ALL USING (public.is_admin());

-- Questions: Students can view questions for modules they are working on.
CREATE POLICY "Students can view questions for modules" ON public.questions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.modules WHERE id = module_id AND is_published = true)
);
CREATE POLICY "Teachers can manage questions" ON public.questions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Admins can do everything on questions" ON public.questions FOR ALL USING (public.is_admin());

-- Submissions: Students can view and manage their own. Teachers can view and update all.
CREATE POLICY "Students can manage their own submissions" ON public.assignment_submissions FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Teachers can manage all submissions" ON public.assignment_submissions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Admins can do everything on submissions" ON public.assignment_submissions FOR ALL USING (public.is_admin());

-- Submission Answers: Same as submissions.
CREATE POLICY "Students can manage their own answers" ON public.submission_answers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.assignment_submissions WHERE id = submission_id AND student_id = auth.uid())
);
CREATE POLICY "Teachers can manage all answers" ON public.submission_answers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Admins can do everything on answers" ON public.submission_answers FOR ALL USING (public.is_admin());

-- Student Stats: Viewable by all (leaderboard), updated by students (streaks) and teachers (approval).
CREATE POLICY "Stats are viewable by everyone" ON public.student_stats FOR SELECT USING (true);
CREATE POLICY "Users can update their own stats" ON public.student_stats FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Teachers can update all stats" ON public.student_stats FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Admins can do everything on stats" ON public.student_stats FOR ALL USING (public.is_admin());

-- Broadcasts: Viewable by all. Managed by teachers.
CREATE POLICY "Broadcasts are viewable by everyone" ON public.broadcasts FOR SELECT USING (true);
CREATE POLICY "Teachers can manage broadcasts" ON public.broadcasts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Admins can do everything on broadcasts" ON public.broadcasts FOR ALL USING (public.is_admin());

-- Doubts: Students can view all doubts. Teachers can view all.
CREATE POLICY "Everyone can view all doubts" ON public.doubts FOR SELECT USING (true);
CREATE POLICY "Students can create doubts" ON public.doubts FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Teachers can update doubts" ON public.doubts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Admins can do everything on doubts" ON public.doubts FOR ALL USING (public.is_admin());

-- Doubt Replies: Viewable by all.
CREATE POLICY "Replies are viewable by everyone" ON public.doubt_replies FOR SELECT USING (true);
CREATE POLICY "Anyone can create replies" ON public.doubt_replies FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Admins can do everything on replies" ON public.doubt_replies FOR ALL USING (public.is_admin());

-- Notifications: Only viewable by recipient.
CREATE POLICY "Notifications are viewable by recipient" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Recipient can update their notifications" ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id);
CREATE POLICY "Teachers can insert notifications" ON public.notifications FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Admins can do everything on notifications" ON public.notifications FOR ALL USING (public.is_admin());

-- Admin Security Logs: Hardened Forensics
CREATE POLICY "Allow recording security attempts" ON public.admin_security_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view logs" ON public.admin_security_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Immutable logs" ON public.admin_security_logs FOR UPDATE USING (false);
CREATE POLICY "Indestructible logs" ON public.admin_security_logs FOR DELETE USING (false);

-- Admin Trusted Devices
CREATE POLICY "Admins manage trust" ON public.admin_trusted_devices FOR ALL USING (public.is_admin());

-- 4. Triggers & Functions

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, login_id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'login_id', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
    );

    IF COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student') = 'student' THEN
        INSERT INTO public.student_stats (student_id)
        VALUES (NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_modules_updated_at BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_answers_updated_at BEFORE UPDATE ON public.submission_answers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_stats_updated_at BEFORE UPDATE ON public.student_stats FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_doubts_updated_at BEFORE UPDATE ON public.doubts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
