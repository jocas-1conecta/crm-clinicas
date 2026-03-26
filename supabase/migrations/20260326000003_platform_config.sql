-- Platform-level configuration (branding for the SaaS itself)
CREATE TABLE IF NOT EXISTS platform_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value jsonb NOT NULL DEFAULT '{}',
    updated_at timestamptz DEFAULT now()
);

-- Seed default branding row
INSERT INTO platform_config (key, value) VALUES (
    'branding',
    '{"app_name":"1Clinic","logo_url":null,"login_logo_url":null,"favicon_url":null,"primary_color":"#0d9488"}'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- RLS: only Platform_Owner can read/write
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform_Owner can manage config"
ON platform_config FOR ALL
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Platform_Owner')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Platform_Owner')
);
