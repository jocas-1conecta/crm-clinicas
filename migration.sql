-- SQL MIGRATION PARA ARQUITECTURA SAAS MULTI-TENANT

-- 1. Soporte para Módulos Activos (Feature Flags por tenant)
-- Asumiendo que la tabla de empresas se llama "clinicas" actualmente (que pasará a ser tenants a nivel conceptual)
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS active_modules JSONB DEFAULT '[]'::jsonb;

-- Ejemplo: Habilitar el módulo médico para una clínica específica (o para todas como refactorización inicial):
-- UPDATE clinicas SET active_modules = '["clinic_core"]'::jsonb;


-- 2. Habilitar y Forzar Row Level Security (RLS)
-- Asegura que todas las tablas críticas requieran pasar por RLS.
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
-- (Añadir tabla appointments si existe en la BD pura, sino las tareas/citas)

-- 3. Políticas de Seguridad (Aislamiento Multi-Tenant estricto)
-- Se extrae el tenant_id del JWT provisto por Supabase Auth en cada petición de red.
-- Como las tablas (patients, leads) están amarradas a sucursal, cruzamos por esa tabla.

-- Política para Pacientes:
CREATE POLICY "Aislamiento Tenant Pacientes" 
ON patients 
FOR ALL 
USING (
    sucursal_id IN (
        SELECT id FROM sucursales WHERE clinica_id = (auth.jwt()->>'tenant_id')::uuid
    )
);

-- Política para Leads:
CREATE POLICY "Aislamiento Tenant Leads" 
ON leads 
FOR ALL 
USING (
    sucursal_id IN (
        SELECT id FROM sucursales WHERE clinica_id = (auth.jwt()->>'tenant_id')::uuid
    )
);

-- Política para Deals (Oportunidades):
CREATE POLICY "Aislamiento Tenant Deals" 
ON deals 
FOR ALL 
USING (
    patient_id IN (
        SELECT id FROM patients WHERE sucursal_id IN (
            SELECT id FROM sucursales WHERE clinica_id = (auth.jwt()->>'tenant_id')::uuid
        )
    )
);


-- 4. Optimización de Consultas para Altos Volúmenes (Índices)
-- Crear índices compuestos en las sucursales para agilizar los joins de RLS

-- Índices en Patients (Búsqueda por directorio y autenticación de sucursales)
CREATE INDEX IF NOT EXISTS idx_patients_sucursal ON patients(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

-- Índices en Leads (Para el pipeline y estados Kanban)
CREATE INDEX IF NOT EXISTS idx_leads_sucursal_status ON leads(sucursal_id, status);

-- Índices en Deals
CREATE INDEX IF NOT EXISTS idx_deals_patient ON deals(patient_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
