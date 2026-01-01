import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function PUT(request: Request, { params }: { params: { runId: string } }) {
  try {
    const runId = Number(params.runId)
    const body = await request.json()

    const updates = body?.updates as {
      studentId: number
      decision: 'retain' | 'promote' | 'conditional_promote'
    }[]

    if (!runId || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Ensure run is draft
    const { data: run, error: runErr } = await supabase
      .from('promotion_runs')
      .select('id, status')
      .eq('id', runId)
      .single()

    if (runErr) return NextResponse.json({ error: runErr.message }, { status: 500 })
    if (run.status !== 'draft') return NextResponse.json({ error: 'Run is not editable.' }, { status: 409 })

    // Update each student decision (no upsert; prevents null from_enrollment_id inserts)
    for (const u of updates) {
      const { data, error, count } = await supabase
        .from('promotion_run_students')
        .update({ decision: u.decision })
        .eq('promotion_run_id', runId)
        .eq('student_id', u.studentId)
        .select('id') // forces returning rows so we can detect "0 updated"
        .maybeSingle()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // If row doesn't exist, tell frontend to reload run (it should exist)
      if (!data?.id) {
        return NextResponse.json(
          { error: 'Decision row not found for student. Reload the page and try again.' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
