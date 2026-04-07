-- Create post_views table for tracking post view counts
CREATE TABLE IF NOT EXISTS public.post_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON public.post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON public.post_views(user_id);
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_at ON public.post_views(viewed_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- Create policy for users to insert their own views
CREATE POLICY "Users can insert their own views" ON public.post_views
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Create policy for users to read all views (for view counts)
CREATE POLICY "Anyone can read views" ON public.post_views
    FOR SELECT
    TO authenticated
    USING (true);

-- Grant permissions
GRANT SELECT, INSERT ON public.post_views TO authenticated;
GRANT SELECT, INSERT ON public.post_views TO anon;

-- Add view_count column to social_posts if it doesn't exist
ALTER TABLE public.social_posts
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create a function to update view count
CREATE OR REPLACE FUNCTION update_post_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.social_posts
    SET view_count = (
        SELECT COUNT(*)
        FROM public.post_views
        WHERE post_id = NEW.post_id
    )
    WHERE id = NEW.post_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update view count
DROP TRIGGER IF EXISTS trigger_update_post_view_count ON public.post_views;
CREATE TRIGGER trigger_update_post_view_count
    AFTER INSERT ON public.post_views
    FOR EACH ROW
    EXECUTE FUNCTION update_post_view_count();

COMMENT ON TABLE public.post_views IS 'Tracks user views of social posts';
