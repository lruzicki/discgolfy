-- Seed data for Disc Golf application

-- Profiles
INSERT INTO profiles (id, display_name, first_name, is_guest)
VALUES ('00000000-0000-0000-0000-000000000001', 'Lucas', 'Lucas', false)
ON CONFLICT (id) DO NOTHING;

-- Courses
INSERT INTO courses (id, name, location)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Disc Golf w Parku im. R. Reagana', 'Gdańsk, Poland'),
  ('22222222-2222-2222-2222-222222222222', 'Jaśkowa Disc Golf', 'Gdańsk, Poland'),
  ('33333333-3333-3333-3333-333333333333', 'Disc Golf Na Zboczu', 'Gdańsk, Poland')
ON CONFLICT (id) DO NOTHING;

-- Layouts
INSERT INTO layouts (id, course_id, name, hole_count)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '18 Dołków', 18),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', '18 Dołków', 18),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', '9 Dołków', 9)
ON CONFLICT (id) DO NOTHING;

-- Holes (sample for Jaśkowa Hole 1)
INSERT INTO holes (id, layout_id, hole_number, par, distance_m)
VALUES ('99999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 3, 75)
ON CONFLICT (id) DO NOTHING;
