create table if not exists public.student_hafiz_extras (
  id uuid primary key default gen_random_uuid(),
  attendance_record_id uuid not null unique references public.attendance_records(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  plan_id uuid null references public.student_plans(id) on delete set null,
  semester_id uuid null references public.semesters(id) on delete set null,
  attendance_date date not null,
  extra_pages numeric(3,1) not null check (extra_pages in (0.5, 1.0, 2.0)),
  points_awarded integer not null default 0 check (points_awarded in (5, 10, 20)),
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists student_hafiz_extras_student_semester_idx
  on public.student_hafiz_extras (student_id, semester_id, attendance_date);

create index if not exists student_hafiz_extras_attendance_date_idx
  on public.student_hafiz_extras (attendance_date);