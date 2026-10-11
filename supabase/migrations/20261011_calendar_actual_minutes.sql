-- Actual workout time (minutes), entered on the workout summary (optional for the trainee).
-- Compare with Workouts.EstimatedTotalTime; climbing time in mixed workouts is derived in reports.
-- NULL = not reported → reports fall back to the estimated time.
-- Applied manually in Supabase (SQL editor).

ALTER TABLE "Calendar"
  ADD COLUMN IF NOT EXISTS "ActualMinutes" INTEGER NULL;
