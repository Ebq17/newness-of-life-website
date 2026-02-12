-- Create storage bucket for event media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-media',
  'event-media',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for event-media bucket

-- Anyone can view files
CREATE POLICY "Public can view event media" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-media');

-- Authenticated users can upload files
CREATE POLICY "Authenticated users can upload event media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-media'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can update their files
CREATE POLICY "Authenticated users can update event media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'event-media'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can delete files
CREATE POLICY "Authenticated users can delete event media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'event-media'
    AND auth.role() = 'authenticated'
  );
