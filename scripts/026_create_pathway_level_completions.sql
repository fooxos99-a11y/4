-- جدول لتخزين حالة إكمال كل طالب لكل مستوى
create table if not exists pathway_level_completions (
  id serial primary key,
  student_id uuid references students(id) on delete cascade,
  level_number integer not null,
  completed_at timestamp default now(),
  points_earned integer default 0,
  unique(student_id, level_number)
);
