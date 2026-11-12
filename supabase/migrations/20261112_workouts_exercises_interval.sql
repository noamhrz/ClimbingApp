-- Interval timer (repeaters): seconds of work and of rest between reps. Both set = the exercise
-- gets a full-screen timer in the workout. Reps = hangs per set, Rest = between sets.
alter table "WorkoutsExercises"
  add column if not exists "IntervalWorkSec" integer,
  add column if not exists "IntervalRestSec" integer;
