-- ==============================================================================
-- Namdapha Certificate Management & Verification Portal
-- Migration: 20261015000001_restrict_event_categories.sql
-- Description: Enforce exactly 4 official Event categories:
--              1. Impact
--              2. Cultural
--              3. Sport
--              4. Technical
--              Migrates any legacy category data to match these 4 categories.
-- ==============================================================================

-- 1. Temporarily drop the old check constraint to allow updating existing records
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_category_check;

-- 2. Convert previously added/legacy categories into the 4 official categories
UPDATE public.events
SET category = CASE
    WHEN category IN ('Technology', 'Tech') THEN 'Technical'
    WHEN category IN ('Sports', 'Athletics') THEN 'Sport'
    WHEN category IN ('Debate', 'Literary', 'Oratory') THEN 'Impact'
    WHEN category IN ('Music', 'Dance', 'Arts') THEN 'Cultural'
    WHEN category = 'Other' THEN 'Technical'
    ELSE category
END;

-- Any remaining non-matching category defaults safely to 'Technical'
UPDATE public.events
SET category = 'Technical'
WHERE category NOT IN ('Impact', 'Cultural', 'Sport', 'Technical');

-- 3. Add strict check constraint enforcing ONLY the 4 official categories
ALTER TABLE public.events
  ADD CONSTRAINT events_category_check
  CHECK (category IN ('Impact', 'Cultural', 'Sport', 'Technical'));
