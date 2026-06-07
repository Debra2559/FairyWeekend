
CREATE TABLE public.journey_parties (
  id text PRIMARY KEY,
  host_key text NOT NULL DEFAULT 'default',
  card jsonb NOT NULL,
  journey jsonb NOT NULL,
  city text,
  group_mode text NOT NULL DEFAULT 'friends',
  members jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_parties TO anon, authenticated;
GRANT ALL ON public.journey_parties TO service_role;

ALTER TABLE public.journey_parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "party read all" ON public.journey_parties FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "party insert all" ON public.journey_parties FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "party update all" ON public.journey_parties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.journey_parties;
ALTER TABLE public.journey_parties REPLICA IDENTITY FULL;
