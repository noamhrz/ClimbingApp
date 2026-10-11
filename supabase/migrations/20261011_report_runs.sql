-- Log of coach report runs (daily cron + test sends), shown on the reports page.
-- Applied manually in Supabase (SQL editor).

CREATE TABLE IF NOT EXISTS "ReportRuns" (
  "RunID"   BIGSERIAL PRIMARY KEY,
  "RunAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "Source"  TEXT NOT NULL,              -- 'cron' | 'test'
  "Ok"      BOOLEAN NOT NULL,
  "Results" JSONB
);

-- Only the server (service role) reads and writes it.
ALTER TABLE "ReportRuns" ENABLE ROW LEVEL SECURITY;
