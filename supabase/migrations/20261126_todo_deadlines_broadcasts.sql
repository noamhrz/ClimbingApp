-- Monthly-session task deadlines (+ which reminder was sent) and the broadcast log.
alter table "CoachTodos"
  add column if not exists "DueDate" date,
  add column if not exists "ReminderStage" smallint not null default 0;
alter table "AthleteTodos"
  add column if not exists "DueDate" date,
  add column if not exists "ReminderStage" smallint not null default 0;

create table if not exists "Broadcasts" (
  "BroadcastID" bigserial primary key,
  "CreatedAt" timestamptz not null default now(),
  "SentBy" text,
  "Topic" text,
  "Body" text,
  "Extra" text,
  "Recipients" int,
  "Sent" int,
  "Failed" int,
  "Details" jsonb
);
alter table "Broadcasts" enable row level security;
