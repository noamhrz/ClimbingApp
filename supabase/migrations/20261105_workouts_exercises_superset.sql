-- Superset blocks: every exercise of a block marked as superset carries Superset = true.
-- In the workout, a superset block goes in rounds (one set of each exercise, then the next round).
alter table "WorkoutsExercises" add column if not exists "Superset" boolean not null default false;
