-- Actual time of a session (minutes), entered on the workout summary (optional for the trainee).
--   ClimbingMinutes — gross climbing time (next to the wall), compare with Workouts.EstimatedClimbingTime
--   ExerciseMinutes — time spent on the exercises,           compare with Workouts.CalculatedExercisesTime
-- NULL = not reported → reports fall back to the planned time.
-- Applied manually in Supabase (SQL editor).

ALTER TABLE "Calendar"
  ADD COLUMN IF NOT EXISTS "ClimbingMinutes" INTEGER NULL,
  ADD COLUMN IF NOT EXISTS "ExerciseMinutes" INTEGER NULL;
