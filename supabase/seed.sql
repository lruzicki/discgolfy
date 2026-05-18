-- Seed data for Disc Golf application
-- Ten plik jest automatycznie uruchamiany przy 'supabase db reset'

-- Profiles
INSERT INTO profiles (id, display_name, first_name, is_guest)
VALUES ('00000000-0000-0000-0000-000000000001', 'Lucas', 'Lucas', false)
ON CONFLICT (id) DO NOTHING;

-- Courses
INSERT INTO courses (id, name, location)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Park Reagana', 'Gdańsk'),
  ('22222222-2222-2222-2222-222222222222', 'Jaśkowa Disc Golf', 'Gdańsk'),
  ('33333333-3333-3333-3333-333333333333', 'Disc Golf Na Zboczu', 'Gdańsk')
ON CONFLICT (id) DO NOTHING;

-- Layouts
INSERT INTO layouts (id, course_id, name, hole_count)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Standard 18', 18),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', '18 Dołków', 18),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', '9 Dołków', 9)
ON CONFLICT (id) DO NOTHING;

-- Holes for Park Reagana (Standard 18)
-- Precise GPS coordinates for Tee and Basket
INSERT INTO holes (layout_id, hole_number, par, distance_m, tee_latitude, tee_longitude, basket_latitude, basket_longitude)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 3, 68, 54.408683, 18.615761, 54.409287, 18.615958),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, 3, 221, 54.409246, 18.615635, 54.410268, 18.612686),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, 3, 96, 54.411596, 18.613449, 54.411600, 18.611971),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 3, 126, 54.411743, 18.611209, 54.412651, 18.610066),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5, 3, 81, 54.413306, 18.610645, 54.412830, 18.611602),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 6, 3, 100, 54.412639, 18.612159, 54.411769, 18.611764),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 7, 3, 65, 54.411727, 18.611219, 54.412219, 18.610666),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 8, 3, 83, 54.410866, 18.609892, 54.410696, 18.608647),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 9, 3, 171, 54.409385, 18.608970, 54.410372, 18.606919),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 10, 3, 87, 54.410853, 18.606556, 54.411516, 18.605867),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 11, 3, 98, 54.411483, 18.605109, 54.412292, 18.604525),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 12, 3, 97, 54.412811, 18.604656, 54.413198, 18.603318),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 13, 3, 67, 54.413450, 18.604220, 54.413141, 18.605123),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 14, 3, 67, 54.412846, 18.606015, 54.412371, 18.605385),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 15, 3, 74, 54.412029, 18.606347, 54.411705, 18.607342),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 16, 3, 101, 54.410762, 18.610745, 54.410532, 18.612255),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 17, 3, 64, 54.409665, 18.612764, 54.409373, 18.613608),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 18, 3, 66, 54.409337, 18.614379, 54.408842, 18.614943)
ON CONFLICT DO NOTHING;
