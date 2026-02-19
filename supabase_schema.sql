
-- Create a table for students

create table students (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  classLevel int,
  total_attempted int default 0,
  total_correct int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table students enable row level security;

-- Create a policy to allow anyone to read the rankings
create policy "Allow public read access"
on students for select
using (true);

-- Create a policy to allow inserts/updates (for simplicity, we allow anon updates for now)
-- In a production app, you'd want authentication.
create policy "Allow public insert/update"
on students for all
using (true)
with check (true);
