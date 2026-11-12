-- Bonus workout: a whole scheduled workout that is extra (not required). Gold in the calendar;
-- when not done it is not counted as missed (dashboard, daily/weekly/monthly reports).
alter table "Calendar" add column if not exists "Bonus" boolean not null default false;
