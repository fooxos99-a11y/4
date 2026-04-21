-- إنشاء جدول الفئات
CREATE TABLE IF NOT EXISTS store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول المنتجات
CREATE TABLE IF NOT EXISTS store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  image_url TEXT,
  category_id UUID REFERENCES store_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس
CREATE INDEX IF NOT EXISTS idx_store_products_category_id ON store_products(category_id);
CREATE INDEX IF NOT EXISTS idx_store_categories_name ON store_categories(name);
