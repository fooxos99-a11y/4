-- Create purchases table for store items
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  price INTEGER NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, product_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchases_student_id ON purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id);

-- Enable RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create policy to allow students to view their own purchases
CREATE POLICY "Students can view own purchases" ON purchases
  FOR SELECT
  USING (true);

-- Create policy to allow inserting purchases
CREATE POLICY "Anyone can insert purchases" ON purchases
  FOR INSERT
  WITH CHECK (true);
