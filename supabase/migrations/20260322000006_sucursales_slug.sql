-- Migration: Add slug column to sucursales table
ALTER TABLE public.sucursales ADD COLUMN IF NOT EXISTS slug TEXT;

-- Slug must be unique within the same clinic
CREATE UNIQUE INDEX IF NOT EXISTS idx_sucursales_slug_clinica 
  ON public.sucursales(clinica_id, slug) WHERE slug IS NOT NULL;

-- Auto-generate slug from name for existing branches that don't have one
UPDATE public.sucursales
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRANSLATE(name, 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN'),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;
