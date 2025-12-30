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

export async function GET() {
  try {
    const current = await getCurrentYear()
    if (!current) {
      return NextResponse.json({ error: 'No current academic year found.' }, { status: 400 })
    }

    // Get active enrollments for current year; group by class_section_id (in JS)
    const { data: enrolls, error: eErr } = await supabase
      .from('student_enrollments')
      .select('class_section_id')
      .eq('academic_year_id', current.id)
      .eq('status', 'active')

    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 })

    const ids = Array.from(
      new Set((enrolls || []).map((e: any) => e.class_section_id).filter(Boolean))
    ) as number[]

    if (ids.length === 0) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 })
    }

    // Fetch cohort labels
    const { data: cohorts, error: cErr } = await supabase
      .from('class_sections')
      .select(`
        id,
        class_id,
        section_id,
        classes ( id, name ),
        sections ( id, name )
      `)
      .in('id', ids)
      .order('id', { ascending: true })

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

    const formatted = (cohorts || []).map((c: any) => {
      const className = c.classes?.name ?? ''
      const sectionName = c.sections?.name ?? ''
      return {
        classSectionId: c.id,
        classId: c.class_id,
        sectionId: c.section_id,
        className,
        sectionName,
        label: `${className}${sectionName}`, // e.g. 6A if class name=6 and section name=A
      }
    })

    return NextResponse.json({ success: true, data: formatted }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
