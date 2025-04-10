-- Create ticket_types table
CREATE TABLE IF NOT EXISTS public.ticket_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create seat_layouts table
CREATE TABLE IF NOT EXISTS public.seat_layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    layout_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_layouts ENABLE ROW LEVEL SECURITY;

-- Create policies for ticket_types
CREATE POLICY "Enable read access for all users"
ON public.ticket_types FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable write access for admin users only"
ON public.ticket_types FOR ALL
TO authenticated
USING (auth.email() IN ('admin@showtix.com', 'admin@example.com', 'ritikpaswal79984@gmail.com'));

-- Create policies for seat_layouts
CREATE POLICY "Enable read access for all users"
ON public.seat_layouts FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable write access for admin users only"
ON public.seat_layouts FOR ALL
TO authenticated
USING (auth.email() IN ('admin@showtix.com', 'admin@example.com', 'ritikpaswal79984@gmail.com'));

-- Insert sample ticket types
INSERT INTO public.ticket_types (name, price, description)
VALUES 
('VIP', 5000.00, 'VIP access with meet & greet'),
('Premium', 3000.00, 'Premium seating with complimentary refreshments'),
('Standard', 1000.00, 'Standard seating');

-- Insert sample seat layout for first event
INSERT INTO public.seat_layouts (event_id, layout_data)
SELECT 
    id as event_id,
    '{
        "sections": [
            {
                "name": "VIP",
                "rows": ["A", "B", "C"],
                "seatsPerRow": 10,
                "price": 5000
            },
            {
                "name": "Premium",
                "rows": ["D", "E", "F", "G"],
                "seatsPerRow": 12,
                "price": 3000
            },
            {
                "name": "Standard",
                "rows": ["H", "I", "J", "K", "L"],
                "seatsPerRow": 15,
                "price": 1000
            }
        ]
    }'::jsonb as layout_data
FROM public.events
WHERE title = 'Arijit Singh Live in Concert';
