-- Each appearance of an exercise in a workout gets its own log.
-- Occurrence = 1 for the first appearance of the exercise in the workout, 2 for the second, ...
-- Safe to run before the code change: the current code keeps writing Occurrence = 1.

-- 0) Checks before running (both should return 0 rows)
--    Duplicates under the old rule (should be none while the old constraint exists):
-- SELECT "CalendarID","ExerciseID","HandSide",count(*) FROM "ExerciseLogs" GROUP BY 1,2,3 HAVING count(*) > 1;
--    Rows with no hand side (a NULL would slip past the unique constraint):
-- SELECT count(*) FROM "ExerciseLogs" WHERE "HandSide" IS NULL;

-- 1) New column; every existing log is the first appearance
ALTER TABLE "ExerciseLogs" ADD COLUMN IF NOT EXISTS "Occurrence" smallint NOT NULL DEFAULT 1;

-- 2) Replace the old rule (one log per calendar + exercise + side) with one that includes the appearance
ALTER TABLE "ExerciseLogs" DROP CONSTRAINT IF EXISTS unique_exercise_per_calendar;
DROP INDEX IF EXISTS unique_exercise_per_calendar;
ALTER TABLE "ExerciseLogs"
  ADD CONSTRAINT unique_exercise_occurrence_per_calendar
  UNIQUE ("CalendarID", "ExerciseID", "HandSide", "Occurrence");
