-- Create event_images table (Gallery)
CREATE TABLE IF NOT EXISTS event_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  caption VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_event_images_event ON event_images(event_id);
CREATE INDEX idx_event_images_sort ON event_images(event_id, sort_order);

-- Enable Row Level Security
ALTER TABLE event_images ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Everyone can read images for published events
CREATE POLICY "Public can view images for published events" ON event_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_images.event_id
      AND events.is_published = true
    )
  );

-- Authenticated users can manage all images
CREATE POLICY "Authenticated users can view all images" ON event_images
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert images" ON event_images
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update images" ON event_images
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete images" ON event_images
  FOR DELETE USING (auth.role() = 'authenticated');
