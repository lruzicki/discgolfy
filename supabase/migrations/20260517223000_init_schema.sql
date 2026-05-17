-- Initial schema for Disc Golf application

-- Profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_auth_id uuid REFERENCES auth.users(id),
  display_name text NOT NULL,
  first_name text,
  avatar_url text,
  is_guest boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Discs
CREATE TABLE discs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color_rgba text,
  speed numeric,
  glide numeric,
  turn numeric,
  fade numeric,
  weight_g integer,
  max_throw_m integer,
  max_putt_m integer,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE discs ENABLE ROW LEVEL SECURITY;

-- Courses
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Layouts
CREATE TABLE layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  hole_count integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;

-- Holes
CREATE TABLE holes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id uuid REFERENCES layouts(id) ON DELETE CASCADE NOT NULL,
  hole_number integer NOT NULL,
  par integer NOT NULL,
  distance_m integer,
  tee_latitude numeric,
  tee_longitude numeric,
  basket_latitude numeric,
  basket_longitude numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE holes ENABLE ROW LEVEL SECURITY;

-- Matches
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id uuid REFERENCES layouts(id) NOT NULL,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  date_played timestamptz DEFAULT now(),
  status text CHECK (status IN ('active', 'completed')) DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Match Players
CREATE TABLE match_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES profiles(id) NOT NULL,
  total_score integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

-- Scores
CREATE TABLE scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES profiles(id) NOT NULL,
  hole_id uuid REFERENCES holes(id) NOT NULL,
  strokes integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Throws
CREATE TABLE throws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES profiles(id) NOT NULL,
  hole_id uuid REFERENCES holes(id) NOT NULL,
  disc_id uuid REFERENCES discs(id),
  throw_number integer NOT NULL,
  start_lat numeric,
  start_lng numeric,
  end_lat numeric,
  end_lng numeric,
  distance_m integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE throws ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = auth_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = auth_id);

-- Discs
CREATE POLICY "Discs are viewable by everyone" ON discs FOR SELECT USING (true);
CREATE POLICY "Users can manage own discs" ON discs FOR ALL USING (auth.uid() IN (SELECT auth_id FROM profiles WHERE id = player_id));

-- Courses, Layouts, Holes
CREATE POLICY "Public read access for courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Public read access for layouts" ON layouts FOR SELECT USING (true);
CREATE POLICY "Public read access for holes" ON holes FOR SELECT USING (true);

-- Matches
CREATE POLICY "Matches are viewable by everyone" ON matches FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create matches" ON matches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Creators can update their matches" ON matches FOR UPDATE USING (auth.uid() IN (SELECT auth_id FROM profiles WHERE id = created_by));

-- Match Players
CREATE POLICY "Match players are viewable by everyone" ON match_players FOR SELECT USING (true);
CREATE POLICY "Match creators can manage players" ON match_players FOR ALL USING (
  auth.uid() IN (
    SELECT auth_id FROM profiles WHERE id = (SELECT created_by FROM matches WHERE id = match_id)
  )
);

-- Scores
CREATE POLICY "Scores are viewable by everyone" ON scores FOR SELECT USING (true);
CREATE POLICY "Match creators can manage scores" ON scores FOR ALL USING (
  auth.uid() IN (
    SELECT auth_id FROM profiles WHERE id = (SELECT created_by FROM matches WHERE id = match_id)
  )
);

-- Throws
CREATE POLICY "Throws are viewable by everyone" ON throws FOR SELECT USING (true);
CREATE POLICY "Match creators can manage throws" ON throws FOR ALL USING (
  auth.uid() IN (
    SELECT auth_id FROM profiles WHERE id = (SELECT created_by FROM matches WHERE id = match_id)
  )
);
