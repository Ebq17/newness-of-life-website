-- Create event_categories table
CREATE TABLE IF NOT EXISTS event_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#2563EB',
  icon VARCHAR(50) DEFAULT 'calendar',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for sorting
CREATE INDEX idx_event_categories_sort ON event_categories(sort_order, name);

-- Enable Row Level Security
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Everyone can read active categories
CREATE POLICY "Public can view active categories" ON event_categories
  FOR SELECT USING (is_active = true);

-- Authenticated users can manage categories
CREATE POLICY "Authenticated users can manage categories" ON event_categories
  FOR ALL USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_event_categories_updated_at
  BEFORE UPDATE ON event_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO event_categories (slug, name, color, icon, sort_order) VALUES
  ('gottesdienst', 'Gottesdienst', '#2563EB', 'church', 1),
  ('gebet', 'Gebet', '#10B981', 'hands-praying', 2),
  ('jugend', 'Jugend', '#8B5CF6', 'users', 3),
  ('special', 'Special Event', '#F59E0B', 'star', 4),
  ('gemeinschaft', 'Gemeinschaft', '#EC4899', 'heart', 5)
ON CONFLICT (slug) DO NOTHING;
