-- Add "Order" column to Calendar for same-day workout ordering.
-- Applied manually to Supabase on 2026-06-16.
-- DECIMAL allows fractional ordering in future drag-and-drop features.

ALTER TABLE "Calendar"
  ADD COLUMN IF NOT EXISTS "Order" DECIMAL DEFAULT 0;
