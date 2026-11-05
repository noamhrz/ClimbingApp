-- Alternative exercises in pairs (A ⇄ B): each points at the other. In a workout the trainee
-- can swap an exercise for its alternative; the sets are logged under the one actually done.
alter table "Exercises" add column if not exists "AltExerciseID" integer
  references "Exercises"("ExerciseID") on delete set null;
