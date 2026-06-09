// File: app/api/teacher/classes/route.ts
// GET /api/teacher/classes?teacher_id=X
// Returns all distinct class+section combinations assigned to a teacher,
// along with the subject names for each, using the current academic year context.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const teacherId = searchParams.get('teacher_id')

    if (!teacherId) {
      return NextResponse.json({ error: 'teacher_id is required' }, { status: 400 })
    }

    // Fetch all assignments for this teacher, joining class, section, subject names
    const { data: assignments, error } = await supabase
      .from('teacher_assignments')
      .select(`
        class_id,
        section_id,
        classes ( name ),
        sections ( name ),
        subjects ( name )
      `)
      .eq('teacher_id', teacherId)

    if (error) throw error

    // Group by class_id + section_id to produce distinct rows with subject lists
    const map = new Map<string, {
      class_id: number
      section_id: number
      class_name: string
      section_name: string
      subjects: string[]
    }>()

    for (const row of assignments ?? []) {
      const key = `${row.class_id}_${row.section_id}`
      if (!map.has(key)) {
        map.set(key, {
          class_id: row.class_id,
          section_id: row.section_id,
          class_name: (row.classes as any)?.name ?? '',
          section_name: (row.sections as any)?.name ?? '',
          subjects: [],
        })
      }
      const subjectName = (row.subjects as any)?.name
      if (subjectName) {
        const entry = map.get(key)!
        if (!entry.subjects.includes(subjectName)) {
          entry.subjects.push(subjectName)
        }
      }
    }

    const data = Array.from(map.values()).map((v) => ({
      ...v,
      class_section_key: `${v.class_id}_${v.section_id}`,
    }))

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/teacher/classes]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}