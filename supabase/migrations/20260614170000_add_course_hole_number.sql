ALTER TABLE course_holes
ADD COLUMN IF NOT EXISTS hole_number integer;

WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY course_id ORDER BY created_at, id) AS generated_hole_number
  FROM course_holes
  WHERE hole_number IS NULL
)
UPDATE course_holes
SET hole_number = numbered.generated_hole_number
FROM numbered
WHERE course_holes.id = numbered.id;

ALTER TABLE course_holes
ALTER COLUMN hole_number SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'course_holes_course_id_hole_number_key'
  ) THEN
    ALTER TABLE course_holes
    ADD CONSTRAINT course_holes_course_id_hole_number_key UNIQUE (course_id, hole_number);
  END IF;
END $$;
