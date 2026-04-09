-- Database schema for Apartment Hunter

-- Enable the uuid-ossp extension to generate UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.apartments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  address TEXT NOT NULL,
  price NUMERIC,
  status TEXT DEFAULT 'חדש',
  link TEXT,
  rent NUMERIC,
  arnona_bimonthly NUMERIC DEFAULT 0,
  vaad_bayit NUMERIC DEFAULT 0,
  floor NUMERIC,
  rooms NUMERIC,
  entry_date DATE,
  contact_name TEXT,
  contact_number TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  
  -- Checklists
  has_mamad BOOLEAN DEFAULT false,
  has_ac BOOLEAN DEFAULT false,
  has_solar_heater BOOLEAN DEFAULT false,
  has_elevator BOOLEAN DEFAULT false,
  has_parking BOOLEAN DEFAULT false
);

-- Note: When moving to Production, you should enable Row Level Security (RLS)
-- and add policies, or just use this for local/shared testing by disabling RLS for the time being.
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;

-- If it's just for the two of you, you can optionally allow all anon access (not recommended for public!)
CREATE POLICY "Allow anonymous read" ON public.apartments FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON public.apartments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON public.apartments FOR UPDATE USING (true);
