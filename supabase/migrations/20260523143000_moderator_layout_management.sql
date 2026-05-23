ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_moderator boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT p.is_moderator
    FROM profiles p
    WHERE p.auth_id = auth.uid()
    LIMIT 1
  ), false);
$$;

REVOKE UPDATE (is_moderator) ON profiles FROM authenticated;

CREATE POLICY "Moderators can update profiles" ON profiles
FOR UPDATE
USING (public.is_moderator())
WITH CHECK (public.is_moderator());

CREATE POLICY "Moderators can manage courses" ON courses
FOR ALL
USING (public.is_moderator())
WITH CHECK (public.is_moderator());

CREATE POLICY "Moderators can manage layouts" ON layouts
FOR ALL
USING (public.is_moderator())
WITH CHECK (public.is_moderator());

CREATE POLICY "Moderators can manage holes" ON holes
FOR ALL
USING (public.is_moderator())
WITH CHECK (public.is_moderator());
