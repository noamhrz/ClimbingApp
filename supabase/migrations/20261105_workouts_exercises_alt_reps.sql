-- Reps / seconds for the alternative exercise (empty = same as the exercise).
alter table "WorkoutsExercises"
  add column if not exists "AltReps" integer,
  add column if not exists "AltDuration" integer;
