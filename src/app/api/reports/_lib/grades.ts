import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export function pct(obtained: number | null, max: number | null) {
  if (obtained === null || max === null || max <= 0) return null
  return Math.round((obtained / max) * 10000) / 100
}

export async function resolveGrade(academicYearId: number, percentage: number | null) {
  if (percentage === null) return null

  const { data, error } = await supabase
    .from('grade_scales')
    .select('grade, min_pct, max_pct')
    .or(`academic_year_id.eq.${academicYearId},academic_year_id.is.null`)
    .lte('min_pct', percentage)
    .gte('max_pct', percentage)
    .order('academic_year_id', { ascending: false })
    .order('min_pct', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data?.grade ?? null
}
