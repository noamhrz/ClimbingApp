-- Alternative exercise per exercise in a workout (⇄): set in the workout editor; in the workout
-- the trainee can swap to it, and the sets are logged under the exercise actually done.
alter table "Exercises" drop column if exists "AltExerciseID";
alter table "WorkoutsExercises" add column if not exists "AltExerciseID" integer
  references "Exercises"("ExerciseID") on delete set null;
