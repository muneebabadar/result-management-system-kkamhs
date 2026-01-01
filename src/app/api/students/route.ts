import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/* ===============================
   GET – Fetch students
================================ */
export async function GET() {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
      full_name,
      roll_number,
      class_id,
      section_id,
      status,
      contact_number,
      email
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 200 })
}

/* ===============================
   POST – Add student
================================ */
export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      full_name,
      class_id,
      section_id,
      roll_number,
      father_name,
      mother_name,
      address,
      contact_number,
      email,
    } = body

    /* 🔒 Hard validation */
    if (!full_name) {
      return NextResponse.json(
        { error: 'Student name is required' },
        { status: 400 }
      )
    }

    if (!class_id || !section_id) {
      return NextResponse.json(
        { error: 'Class and Section are required' },
        { status: 400 }
      )
    }

    /* 🔍 Insert */
    const { data, error } = await supabase
      .from('students')
      .insert({
        full_name,
        class_id,
        section_id,
        roll_number: roll_number || null,
        father_name: father_name || null,
        mother_name: mother_name || null,
        address: address || null,
        contact_number: contact_number || null,
        email: email || null,
        status: true,
      })
      .select()
      .single()

    if (error) {
      console.error('INSERT ERROR:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { success: true, student: data },
      { status: 201 }
    )

  } catch (err) {
    console.error('API CRASH:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
