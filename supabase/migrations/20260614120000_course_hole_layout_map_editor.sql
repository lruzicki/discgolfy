CREATE TABLE IF NOT EXISTS course_holes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  par integer NOT NULL DEFAULT 3,
  distance_m integer,
  tee_latitude double precision,
  tee_longitude double precision,
  basket_latitude double precision,
  basket_longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS layout_holes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id uuid NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  course_hole_id uuid NOT NULL REFERENCES course_holes(id) ON DELETE CASCADE,
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (layout_id, course_hole_id),
  UNIQUE (layout_id, position)
);

CREATE TABLE IF NOT EXISTS course_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  style_key text NOT NULL DEFAULT 'park',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_holes ENABLE ROW LEVEL SECURITY;
ALTER TABLE layout_holes ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read course holes" ON course_holes
FOR SELECT
USING (true);

CREATE POLICY "Everyone can read layout holes" ON layout_holes
FOR SELECT
USING (true);

CREATE POLICY "Everyone can read course maps" ON course_maps
FOR SELECT
USING (true);

CREATE POLICY "Moderators can manage course holes" ON course_holes
FOR ALL
USING (public.is_moderator())
WITH CHECK (public.is_moderator());

CREATE POLICY "Moderators can manage layout holes" ON layout_holes
FOR ALL
USING (public.is_moderator())
WITH CHECK (public.is_moderator());

CREATE POLICY "Moderators can manage course maps" ON course_maps
FOR ALL
USING (public.is_moderator())
WITH CHECK (public.is_moderator());
