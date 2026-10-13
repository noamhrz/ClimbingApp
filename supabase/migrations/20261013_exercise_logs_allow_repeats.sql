-- An exercise can appear twice in a workout, and each appearance keeps its own log.
-- The old rule "one log per calendar entry + exercise + hand side" blocks that.
ALTER TABLE "ExerciseLogs" DROP CONSTRAINT IF EXISTS unique_exercise_per_calendar;
DROP INDEX IF EXISTS unique_exercise_per_calendar;
