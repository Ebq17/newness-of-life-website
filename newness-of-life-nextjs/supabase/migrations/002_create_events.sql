-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  location VARCHAR(255),
  category_id UUID REFERENCES event_categories(id) ON DELETE SET NULL,
  main_image_url TEXT,
  flyer_pdf_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule JSONB,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  external_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_category ON events(category_id);
CREATE INDEX idx_events_published ON events(is_published);
CREATE INDEX idx_events_featured ON events(is_featured);
CREATE INDEX idx_events_slug ON events(slug);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Everyone can read published events
CREATE POLICY "Public can view published events" ON events
  FOR SELECT USING (is_published = true);

-- Authenticated users can manage all events
CREATE POLICY "Authenticated users can view all events" ON events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert events" ON events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update events" ON events
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete events" ON events
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
