-- How exact a climbing log's date is. Used by the bulk "trip / history" entry, where a
-- trainee may remember only the month or the year (e.g. a new trainee's climbing résumé).
-- NULL  = exact date (every existing row, and all logs from workouts).
-- month = LogDateTime is the 1st of that month; year = LogDateTime is 1 January of that year.
-- Reports and period stats skip approximate rows, so they never land on a specific day.
-- Applied manually in Supabase (SQL editor).

ALTER TABLE "ClimbingLog"
  ADD COLUMN IF NOT EXISTS "DatePrecision" TEXT NULL;

ALTER TABLE "ClimbingLog"
  DROP CONSTRAINT IF EXISTS "ClimbingLog_DatePrecision_check";

ALTER TABLE "ClimbingLog"
  ADD CONSTRAINT "ClimbingLog_DatePrecision_check"
  CHECK ("DatePrecision" IS NULL OR "DatePrecision" IN ('month', 'year'));
