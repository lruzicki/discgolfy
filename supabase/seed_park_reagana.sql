-- Production Data for Park Reagana Disc Golf Course (Gdańsk)
-- Precise GPS coordinates for Tee and Basket for all 18 holes.
-- To apply: Wklej poniższy kod do SQL Editora w panelu Supabase (http://localhost:54323)

DO $$ 
DECLARE
    v_course_id uuid;
    v_layout_id uuid;
BEGIN
    -- 1. Insert Course
    INSERT INTO courses (name, location) 
    VALUES ('Park Reagana', 'Gdańsk') 
    RETURNING id INTO v_course_id;

    -- 2. Insert Layout
    INSERT INTO layouts (course_id, name, hole_count) 
    VALUES (v_course_id, 'Standard 18', 18) 
    RETURNING id INTO v_layout_id;

    -- 3. Insert Holes with Tee and Basket coordinates
    -- Distances are calculated using Haversine formula based on provided coordinates
    INSERT INTO holes (layout_id, hole_number, par, distance_m, tee_latitude, tee_longitude, basket_latitude, basket_longitude)
    VALUES 
        (v_layout_id, 1, 3, 68, 54.408683, 18.615761, 54.409287, 18.615958),
        (v_layout_id, 2, 3, 221, 54.409246, 18.615635, 54.410268, 18.612686),
        (v_layout_id, 3, 3, 96, 54.411596, 18.613449, 54.411600, 18.611971),
        (v_layout_id, 4, 3, 126, 54.411743, 18.611209, 54.412651, 18.610066),
        (v_layout_id, 5, 3, 81, 54.413306, 18.610645, 54.412830, 18.611602),
        (v_layout_id, 6, 3, 100, 54.412639, 18.612159, 54.411769, 18.611764),
        (v_layout_id, 7, 3, 65, 54.411727, 18.611219, 54.412219, 18.610666),
        (v_layout_id, 8, 3, 83, 54.410866, 18.609892, 54.410696, 18.608647),
        (v_layout_id, 9, 3, 171, 54.409385, 18.608970, 54.410372, 18.606919),
        (v_layout_id, 10, 3, 87, 54.410853, 18.606556, 54.411516, 18.605867),
        (v_layout_id, 11, 3, 98, 54.411483, 18.605109, 54.412292, 18.604525),
        (v_layout_id, 12, 3, 97, 54.412811, 18.604656, 54.413198, 18.603318),
        (v_layout_id, 13, 3, 67, 54.413450, 18.604220, 54.413141, 18.605123),
        (v_layout_id, 14, 3, 67, 54.412846, 18.606015, 54.412371, 18.605385),
        (v_layout_id, 15, 3, 74, 54.412029, 18.606347, 54.411705, 18.607342),
        (v_layout_id, 16, 3, 101, 54.410762, 18.610745, 54.410532, 18.612255),
        (v_layout_id, 17, 3, 64, 54.409665, 18.612764, 54.409373, 18.613608),
        (v_layout_id, 18, 3, 66, 54.409337, 18.614379, 54.408842, 18.614943);

    RAISE NOTICE 'Course Park Reagana created with ID: %', v_course_id;
END $$;
