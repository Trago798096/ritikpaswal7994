-- Seed data for seat_categories
INSERT INTO seat_categories (id, name, price_multiplier) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Standard', 1.0),
    ('22222222-2222-2222-2222-222222222222', 'Premium', 1.5),
    ('33333333-3333-3333-3333-333333333333', 'VIP', 2.0);

-- Seed data for theaters
INSERT INTO theaters (id, name, location, city, state) VALUES
    ('44444444-4444-4444-4444-444444444444', 'PVR Cinemas', 'Phoenix Mall', 'Mumbai', 'Maharashtra'),
    ('55555555-5555-5555-5555-555555555555', 'INOX', 'Oberoi Mall', 'Mumbai', 'Maharashtra');

-- Seed data for screens
INSERT INTO screens (id, theater_id, name, total_seats) VALUES
    ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', 'Screen 1', 100),
    ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'Screen 2', 80),
    ('88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', 'Screen 1', 120);

-- Seed data for seats (example for one screen)
DO $$
DECLARE
    row_letter TEXT;
    seat_num INTEGER;
    category_id UUID;
BEGIN
    FOR row_letter IN SELECT chr(i) FROM generate_series(65, 70) AS i -- A to F
    LOOP
        FOR seat_num IN 1..10 -- 10 seats per row
        LOOP
            -- Assign categories: First 2 rows Premium, last row VIP, rest Standard
            IF row_letter IN ('A', 'B') THEN
                category_id := '22222222-2222-2222-2222-222222222222'; -- Premium
            ELSIF row_letter = 'F' THEN
                category_id := '33333333-3333-3333-3333-333333333333'; -- VIP
            ELSE
                category_id := '11111111-1111-1111-1111-111111111111'; -- Standard
            END IF;

            INSERT INTO seats (screen_id, category_id, row_number, seat_number)
            VALUES (
                '66666666-6666-6666-6666-666666666666',
                category_id,
                row_letter,
                seat_num
            );
        END LOOP;
    END LOOP;
END $$;

-- Seed data for movies
INSERT INTO movies (id, title, description, duration, language, release_date, poster_url, rating) VALUES
    ('99999999-9999-9999-9999-999999999999', 'The Dark Knight', 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.', 152, 'English', '2008-07-18', 'https://example.com/dark-knight-poster.jpg', 4.8),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Inception', 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.', 148, 'English', '2010-07-16', 'https://example.com/inception-poster.jpg', 4.7);

-- Seed data for shows (next 7 days)
INSERT INTO shows (movie_id, screen_id, start_time, end_time, price_base)
SELECT
    CASE WHEN EXTRACT(DOW FROM d) >= 5 THEN '99999999-9999-9999-9999-999999999999'
    ELSE 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' END,
    '66666666-6666-6666-6666-666666666666',
    d + TIME '10:00',
    d + TIME '13:00',
    CASE WHEN EXTRACT(DOW FROM d) >= 5 THEN 300 ELSE 250 END
FROM generate_series(
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days',
    INTERVAL '1 day'
) d;

-- Seed data for a test user
INSERT INTO users (id, email, name) VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'test@example.com', 'Test User');

-- Seed data for a test booking
INSERT INTO bookings (id, user_id, show_id, total_amount, status) VALUES
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     (SELECT id FROM shows ORDER BY start_time LIMIT 1),
     600,
     'confirmed');

-- Book two premium seats for the test booking
INSERT INTO booking_seats (booking_id, seat_id, price)
SELECT
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    id,
    300
FROM seats
WHERE screen_id = '66666666-6666-6666-6666-666666666666'
    AND row_number = 'A'
    AND seat_number IN (5, 6)
LIMIT 2; 