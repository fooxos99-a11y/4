-- إنشاء جدول طلبات الطلاب

CREATE TABLE IF NOT EXISTS store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  is_delivered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_orders_student_id ON store_orders(student_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_product_id ON store_orders(product_id);