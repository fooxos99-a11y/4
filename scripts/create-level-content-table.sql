-- Create table for storing learning content for each level
CREATE TABLE IF NOT EXISTS level_content (
  id SERIAL PRIMARY KEY,
  level_id INTEGER NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'pdf', 'video', 'text', 'link'
  content_title VARCHAR(255) NOT NULL,
  content_description TEXT,
  content_url TEXT,
  content_file_name VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_level_content_level_id ON level_content(level_id);
CREATE INDEX IF NOT EXISTS idx_level_content_active ON level_content(is_active);
