-- Bonus exercises: extra, not required. Shown in gold; the workout summary counts them apart.
alter table "WorkoutsExercises" add column if not exists "Bonus" boolean not null default false;
