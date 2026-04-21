-- Add file_url column to programs table
ALTER TABLE programs ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add comment
COMMENT ON COLUMN programs.file_url IS 'URL to uploaded file (PDF, video, etc.)';
