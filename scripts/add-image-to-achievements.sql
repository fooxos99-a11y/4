-- Add image_url column to achievements table
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment
COMMENT ON COLUMN achievements.image_url IS 'URL of the achievement image stored in Vercel Blob';
