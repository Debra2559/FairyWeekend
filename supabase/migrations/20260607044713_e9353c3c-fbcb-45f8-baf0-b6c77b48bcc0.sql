
-- Add missing RLS policies for dm_memory and quest_history.
-- This app is anonymous (no auth.users); player_key is a client-generated identifier.
-- We mirror the existing permissive pattern used by sibling tables so client reads work.

CREATE POLICY "dm_memory read all" ON public.dm_memory FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dm_memory insert all" ON public.dm_memory FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "dm_memory update all" ON public.dm_memory FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "quest_history read all" ON public.quest_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "quest_history insert all" ON public.quest_history FOR INSERT TO anon, authenticated WITH CHECK (true);
