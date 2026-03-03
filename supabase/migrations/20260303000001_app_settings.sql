-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: app_settings table
-- Stores global application settings persisted in the database.
-- Admins can write; public pages can read (maintenance_mode, allow_registrations).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Seed default values (idempotent)
INSERT INTO public.app_settings (key, value) VALUES
  ('maintenance_mode',    'false'),
  ('allow_registrations', 'true'),
  ('max_file_size_mb',    '50'),
  ('site_announcement',   '')
ON CONFLICT (key) DO NOTHING;

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Public pages (register, login) need to read settings without authentication
CREATE POLICY "Public can read app settings"
  ON public.app_settings
  FOR SELECT
  USING (true);

-- Only admins can insert / update / delete settings
CREATE POLICY "Admins can manage app settings"
  ON public.app_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );
