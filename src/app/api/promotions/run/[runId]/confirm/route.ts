import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(_: Request, { params }: { params: { runId: string } }) {
  try {
    const runId = Number(params.runId)
    if (!runId) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 })

    const { data: run, error: runErr } = await supabase
      .from('promotion_runs')
      .select('id, status, from_academic_year_id, to_academic_year_id, class_section_id')
      .eq('id', runId)
      .single()

    if (runErr) return NextResponse.json({ error: runErr.message }, { status: 500 })
    if (run.status !== 'draft') {
      return NextResponse.json({ error: 'Run already confirmed/cancelled.' }, { status: 409 })
    }

    // Find promotion path for this cohort + years
    const { data: path, error: pErr } = await supabase
      .from('promotion_paths')
      .select('to_class_section_id')
      .eq('from_academic_year_id', run.from_academic_year_id)
      .eq('to_academic_year_id', run.to_academic_year_id)
      .eq('from_class_section_id', run.class_section_id)
      .eq('is_active', true)
      .single()

    if (pErr || !path?.to_class_section_id) {
      return NextResponse.json(
        { error: 'No promotion path defined for this cohort/year. Create it in promotion_paths.' },
        { status: 400 }
      )
    }

    const toClassSectionId = path.to_class_section_id

    // Fetch run student decisions
    const { data: prs, error: prsErr } = await supabase
      .from('promotion_run_students')
      .select('student_id, from_enrollment_id, decision')
      .eq('promotion_run_id', runId)

    if (prsErr) return NextResponse.json({ error: prsErr.message }, { status: 500 })

    const promotedRows = (prs || []).filter(
      (r: any) => r.decision === 'promote' || r.decision === 'conditional_promote'
    )

    const inserts = promotedRows.map((r: any) => ({
      student_id: r.student_id,
      academic_year_id: run.to_academic_year_id,
      class_section_id: toClassSectionId,
      status: 'active',
    }))

    // 1) Create or update next-year enrollments (idempotent)
    if (inserts.length > 0) {
      const { error: insErr } = await supabase
        .from('student_enrollments')
        .upsert(inserts, { onConflict: 'student_id,academic_year_id' })

      if (insErr) {
        return NextResponse.json(
          { error: `Failed creating next-year enrollments: ${insErr.message}` },
          { status: 500 }
        )
      }
    }

    // 2) Mark current enrollments as promoted
    const promotedEnrollmentIds = promotedRows.map((r: any) => r.from_enrollment_id).filter(Boolean)

    if (promotedEnrollmentIds.length > 0) {
      const { error: upErr } = await supabase
        .from('student_enrollments')
        .update({ status: 'promoted' })
        .in('id', promotedEnrollmentIds)

      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    // 3) Confirm run
    const { error: confErr } = await supabase
      .from('promotion_runs')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', runId)

    if (confErr) return NextResponse.json({ error: confErr.message }, { status: 500 })

    // 4) Notification (optional)
    await supabase.from('notifications').insert([
      {
        title: 'Promotions Confirmed',
        description: `Promotion run #${runId} confirmed.`,
        type: 'promotion',
        entity_id: runId,
      },
    ])

    return NextResponse.json(
      { success: true, data: { promoted: inserts.length } },
      { status: 200 }
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
