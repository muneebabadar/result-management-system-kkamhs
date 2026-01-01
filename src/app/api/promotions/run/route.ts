import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getCurrentYear() {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id, name')
    .eq('is_current', true)
    .single()
  if (error || !data?.id) return null
  return data
}

async function getNextYear(currentYearId: number) {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id, name')
    .neq('id', currentYearId)
    .order('id', { ascending: true })

  if (error || !data?.length) return null
  return data.find((y: any) => y.id > currentYearId) || data[data.length - 1]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const classSectionId = Number(searchParams.get('classSectionId'))

    if (!classSectionId) {
      return NextResponse.json({ error: 'classSectionId is required' }, { status: 400 })
    }

    const current = await getCurrentYear()
    if (!current) {
      return NextResponse.json({ error: 'No current academic year found.' }, { status: 400 })
    }

    const next = await getNextYear(current.id)
    if (!next) {
      return NextResponse.json({ error: 'No next academic year found. Create it first.' }, { status: 400 })
    }

    // Cohort label
    const { data: cohort, error: cohErr } = await supabase
      .from('class_sections')
      .select(`id, classes (name), sections (name)`)
      .eq('id', classSectionId)
      .single()

    if (cohErr) return NextResponse.json({ error: cohErr.message }, { status: 500 })

    const c = cohort as any
    
    // Check if it's an object OR an array (safe fallback)
    const className = c?.classes?.name ?? c?.classes?.[0]?.name ?? ''
    const sectionName = c?.sections?.name ?? c?.sections?.[0]?.name ?? ''
    
    const label = `${className} ${sectionName}`.trim()

    // ==========================================================
    // Draft run: fetch-or-create with duplicate-safe fallback
    // ==========================================================
    const { data: existing, error: findErr } = await supabase
      .from('promotion_runs')
      .select('id')
      .eq('from_academic_year_id', current.id)
      .eq('to_academic_year_id', next.id)
      .eq('class_section_id', classSectionId)
      .eq('status', 'draft')
      .maybeSingle()

    if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 })

    let runId: number | undefined = existing?.id

    if (!runId) {
      const { data: created, error: createErr } = await supabase
        .from('promotion_runs')
        .insert([{
          from_academic_year_id: current.id,
          to_academic_year_id: next.id,
          class_section_id: classSectionId,
          status: 'draft',
        }])
        .select('id')
        .single()

      if (createErr) {
        const msg = (createErr as any)?.message || ''
        const code = (createErr as any)?.code || ''
        const isDuplicate = code === '23505' || msg.toLowerCase().includes('ux_promotion_runs_one_draft')

        if (!isDuplicate) {
          return NextResponse.json({ error: createErr.message }, { status: 500 })
        }

        // Someone else created it: re-fetch
        const { data: reFetched, error: refErr } = await supabase
          .from('promotion_runs')
          .select('id')
          .eq('from_academic_year_id', current.id)
          .eq('to_academic_year_id', next.id)
          .eq('class_section_id', classSectionId)
          .eq('status', 'draft')
          .maybeSingle()

        if (refErr || !reFetched?.id) {
          return NextResponse.json({ error: 'Draft run exists but could not be re-fetched.' }, { status: 500 })
        }

        runId = reFetched.id
      } else {
        runId = created.id
      }
    }

    // Get active enrollments for cohort in current year
    const { data: enrolls, error: eErr } = await supabase
      .from('student_enrollments')
      .select(`
        id,
        student_id,
        roll_number,
        students ( id, full_name )
      `)
      .eq('academic_year_id', current.id)
      .eq('class_section_id', classSectionId)
      .eq('status', 'active')
      .order('student_id', { ascending: true })

    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 })

    // Outcomes snapshot (optional)
    const studentIds = (enrolls || []).map((e: any) => e.student_id)
    const outcomesMap = new Map<number, any>()

    if (studentIds.length) {
      const { data: outcomes } = await supabase
        .from('student_year_outcomes')
        .select('student_id, overall_result, overall_percentage, overall_grade')
        .eq('academic_year_id', current.id)
        .in('student_id', studentIds)

      for (const o of outcomes || []) outcomesMap.set((o as any).student_id, o)
    }

    // IMPORTANT: default decisions
    // - If outcome is pass => promote
    // - else => retain (user can set conditional_promote via checkbox)
    const prsUpserts = (enrolls || []).map((e: any) => {
      const eligibility = outcomesMap.get(e.student_id)?.overall_result ?? null
      const defaultDecision = eligibility === 'pass' ? 'promote' : 'retain'
      return {
        promotion_run_id: runId,
        student_id: e.student_id,
        from_enrollment_id: e.id,
        decision: defaultDecision,
        eligibility_status: eligibility,
      }
    })

    if (prsUpserts.length) {
      const { error: upErr } = await supabase
        .from('promotion_run_students')
        .upsert(prsUpserts, { onConflict: 'promotion_run_id,student_id' })

      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    // Fetch decisions back
    const { data: runStudents, error: rsErr } = await supabase
      .from('promotion_run_students')
      .select('student_id, decision, eligibility_status')
      .eq('promotion_run_id', runId)

    if (rsErr) return NextResponse.json({ error: rsErr.message }, { status: 500 })

    const decisionMap = new Map<number, any>((runStudents || []).map((r: any) => [r.student_id, r]))

    const rows = (enrolls || []).map((e: any) => {
      const d = decisionMap.get(e.student_id)
      const eligibility = d?.eligibility_status ?? null

      const overallResult: 'Pass' | 'Fail' = eligibility === 'pass' ? 'Pass' : 'Fail'

      const promotionStatus: 'Promoted' | 'Not Promoted' =
        d?.decision === 'promote' || d?.decision === 'conditional_promote' ? 'Promoted' : 'Not Promoted'

      return {
        studentId: e.student_id,
        enrollmentId: e.id,
        name: e.students?.full_name || 'Unknown',
        classLabel: label,
        overallResult,
        decision: d?.decision ?? 'retain',
        promotionStatus,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        runId,
        fromYear: current,
        toYear: next,
        classSectionId,
        classLabel: label,
        students: rows,
      },
    }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
