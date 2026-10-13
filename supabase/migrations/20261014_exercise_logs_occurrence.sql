-- Each appearance of an exercise in a workout, and each set of it, gets its own log.
--   Occurrence = 1 for the first appearance of the exercise in the workout, 2 for the second, ...
--   SetNumber  = 1, 2, 3 ... when sets are logged one by one; 1 when one value is logged for the whole exercise.
-- Safe to run before the code change: the current code writes one row per exercise and side,
-- which becomes Occurrence = 1, SetNumber = 1.

-- 0) Checks before running (all should return 0 / no rows)
--    Duplicates under the old rule (should be none while the old constraint exists):
-- SELECT "CalendarID","ExerciseID","HandSide",count(*) FROM "ExerciseLogs" GROUP BY 1,2,3 HAVING count(*) > 1;
--    Rows with no hand side (a NULL would slip past the unique constraint):
-- SELECT count(*) FROM "ExerciseLogs" WHERE "HandSide" IS NULL;
--    What SetNumber holds today (expected: only NULL, or NULL and 1):
-- SELECT "SetNumber", count(*) FROM "ExerciseLogs" GROUP BY 1 ORDER BY 1;

-- 1) Appearance column; every existing log is the first appearance
ALTER TABLE "ExerciseLogs" ADD COLUMN IF NOT EXISTS "Occurrence" smallint NOT NULL DEFAULT 1;

-- 2) SetNumber (already exists, unused by the app): existing logs = set 1, never NULL from now on
UPDATE "ExerciseLogs" SET "SetNumber" = 1 WHERE "SetNumber" IS NULL;
ALTER TABLE "ExerciseLogs" ALTER COLUMN "SetNumber" SET DEFAULT 1;
ALTER TABLE "ExerciseLogs" ALTER COLUMN "SetNumber" SET NOT NULL;

-- 3) Replace the old rule (one log per calendar + exercise + side)
ALTER TABLE "ExerciseLogs" DROP CONSTRAINT IF EXISTS unique_exercise_per_calendar;
DROP INDEX IF EXISTS unique_exercise_per_calendar;
ALTER TABLE "ExerciseLogs"
  ADD CONSTRAINT unique_exercise_set_per_calendar
  UNIQUE ("CalendarID", "ExerciseID", "HandSide", "Occurrence", "SetNumber");
