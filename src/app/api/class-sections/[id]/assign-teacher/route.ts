import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { teacherId } = body

    // 1. Get the class_section row to know class_id and section_id
    const { data: cs, error: csErr } = await supabase
      .from('class_sections')
      .select('id, class_id, section_id')
      .eq('id', params.id)
      .single()

    if (csErr || !cs) {
      return NextResponse.json({ error: 'Class section not found' }, { status: 404 })
    }

    // 2. Update class_sections.class_teacher_id (existing behaviour)
    const { error: updateErr } = await supabase
      .from('class_sections')
      .update({ class_teacher_id: teacherId ?? null })
      .eq('id', params.id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // 3. Remove any existing teacher_assignments rows for this class+section
    //    (covers both unassign and re-assign to a different teacher)
    const { error: deleteErr } = await supabase
      .from('teacher_assignments')
      .delete()
      .eq('class_id', cs.class_id)
      .eq('section_id', cs.section_id)

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    // 4. If a teacher was assigned (not unassigned), insert rows into
    //    teacher_assignments — one row per subject configured for this class
    if (teacherId) {
      const { data: subjectConfigs, error: subjErr } = await supabase
        .from('class_subject_config')
        .select('subject_id')
        .eq('class_id', cs.class_id)

      if (subjErr) {
        return NextResponse.json({ error: subjErr.message }, { status: 500 })
      }

      if (subjectConfigs && subjectConfigs.length > 0) {
        const rows = subjectConfigs.map((sc: { subject_id: number }) => ({
          teacher_id: teacherId,
          class_id:   cs.class_id,
          section_id: cs.section_id,
          subject_id: sc.subject_id,
        }))

        const { error: insertErr } = await supabase
          .from('teacher_assignments')
          .insert(rows)

        if (insertErr) {
          return NextResponse.json({ error: insertErr.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}