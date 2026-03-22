import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────
interface TaskSequence {
    id: string
    name: string
    is_active: boolean
    trigger_type: string
    pipeline: string
    holidays: string[]
    steps?: TaskSequenceStep[]
}

interface TaskSequenceStep {
    id: string
    sequence_id: string
    step_order: number
    title: string
    description: string | null
    task_type: string
    delay_days: number
    delay_hours: number
    priority: string
}

// ─── Business Days Calculator ─────────────────────────────────
function addBusinessDays(baseDate: Date, nDays: number, holidays: Set<string>): Date {
    if (nDays === 0) return new Date(baseDate)
    const result = new Date(baseDate)
    let added = 0
    while (added < nDays) {
        result.setDate(result.getDate() + 1)
        const dow = result.getDay()
        const iso = result.toISOString().split('T')[0]
        if (dow !== 0 && dow !== 6 && !holidays.has(iso)) {
            added++
        }
    }
    return result
}

function buildDueDate(baseDate: Date, delayDays: number, delayHours: number, holidays: Set<string>): string {
    const target = addBusinessDays(baseDate, delayDays, holidays)
    const y = target.getFullYear()
    const m = String(target.getMonth() + 1).padStart(2, '0')
    const d = String(target.getDate()).padStart(2, '0')
    const h = String(delayHours).padStart(2, '0')
    return `${y}-${m}-${d}T${h}:00:00.000Z`
}

// ─── Main Execution Function ──────────────────────────────────
export async function executeTaskSequences(
    leadId: string,
    assignedTo: string,
    sucursalId: string,
    pipeline: string = 'leads'
): Promise<void> {
    try {
        // 1. Fetch active sequences matching the pipeline
        const { data: sequences, error: seqError } = await supabase
            .from('task_sequences')
            .select('*, task_sequence_steps(*)')
            .eq('is_active', true)
            .eq('trigger_type', 'lead_assigned')
            .or(`pipeline.eq.${pipeline},pipeline.eq.all`)

        if (seqError || !sequences || sequences.length === 0) {
            console.log('[TaskSequence] No active sequences found for', pipeline)
            return
        }

        // 2. Get existing task titles for this lead (idempotency)
        const { data: existingTasks } = await supabase
            .from('crm_tasks')
            .select('title')
            .eq('lead_id', leadId)
        
        const existingTitles = new Set((existingTasks || []).map(t => t.title))

        // 3. Build tasks from all matching sequences
        const tasksToInsert: any[] = []
        const baseDate = new Date()

        for (const seq of sequences as TaskSequence[]) {
            const holidays = new Set(seq.holidays || [])
            const steps = (seq.steps || []).sort((a, b) => a.step_order - b.step_order)

            for (const step of steps) {
                const fullTitle = `${step.title}`
                
                // Skip if already exists (idempotency)
                if (existingTitles.has(fullTitle)) {
                    console.log(`[TaskSequence] Skipping duplicate: "${fullTitle}"`)
                    continue
                }

                const dueDate = buildDueDate(baseDate, step.delay_days, step.delay_hours, holidays)

                tasksToInsert.push({
                    lead_id: leadId,
                    assigned_to: assignedTo,
                    sucursal_id: sucursalId,
                    title: fullTitle,
                    description: step.description,
                    task_type: step.task_type || 'otro',
                    priority: step.priority || 'normal',
                    due_date: dueDate,
                    extra_fields: {
                        sequence_id: seq.id,
                        sequence_name: seq.name,
                        step_order: step.step_order,
                    },
                })

                existingTitles.add(fullTitle) // Prevent within-batch duplicates
            }
        }

        // 4. Bulk insert
        if (tasksToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('crm_tasks')
                .insert(tasksToInsert)

            if (insertError) {
                console.error('[TaskSequence] Insert error:', insertError)
            } else {
                console.log(`[TaskSequence] Inserted ${tasksToInsert.length} tasks for lead ${leadId}`)
            }
        }
    } catch (err) {
        console.error('[TaskSequence] Execution error:', err)
    }
}

// ─── Exported Helpers (for Holidays editor in admin) ──────────
export const MEXICO_HOLIDAYS_2026 = [
    '2026-01-01', // Año Nuevo
    '2026-02-02', // Día de la Constitución
    '2026-03-16', // Natalicio de Benito Juárez
    '2026-05-01', // Día del Trabajo
    '2026-09-16', // Día de la Independencia
    '2026-11-16', // Revolución Mexicana
    '2026-12-25', // Navidad
]
