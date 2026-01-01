import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

type SettingsKey = 'grading_rules' | 'promotion_criteria'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key,value,updated_at,updated_by_user_id')
      .in('key', ['grading_rules', 'promotion_criteria'])

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const map: Record<string, string> = {}
    for (const row of data || []) map[row.key] = row.value

    return NextResponse.json(
      {
        success: true,
        data: {
          grading_rules: map['grading_rules'] ?? '',
          promotion_criteria: map['promotion_criteria'] ?? '',
        },
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const userId = Number(body?.userId) || null
    const updates = body?.updates as Partial<Record<SettingsKey, string>>

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const keys = Object.keys(updates) as SettingsKey[]
    const allowed: SettingsKey[] = ['grading_rules', 'promotion_criteria']
    for (const k of keys) {
      if (!allowed.includes(k)) {
        return NextResponse.json({ error: `Invalid key: ${k}` }, { status: 400 })
      }
      if (typeof updates[k] !== 'string') {
        return NextResponse.json({ error: `Invalid value for ${k}` }, { status: 400 })
      }
    }

    // fetch old values for history
    const { data: existing, error: readErr } = await supabase
      .from('app_settings')
      .select('key,value')
      .in('key', keys)

    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })

    const oldMap = new Map<string, string>()
    for (const r of existing || []) oldMap.set(r.key, r.value)

    // upsert settings
    const rows = keys.map((k) => ({
      key: k,
      value: updates[k] ?? '',
      updated_at: new Date().toISOString(),
      updated_by_user_id: userId,
    }))

    const { error: upErr } = await supabase
      .from('app_settings')
      .upsert(rows, { onConflict: 'key' })

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    // write history
    const hist = keys.map((k) => ({
      key: k,
      old_value: oldMap.get(k) ?? null,
      new_value: updates[k] ?? '',
      changed_by_user_id: userId,
    }))

    await supabase.from('app_settings_history').insert(hist)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}