'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Teacher = { id: number; name: string; email: string; status: boolean }

export default function AssignTeacherPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [teacherId, setTeacherId] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')

      const [rowRes, teachersRes] = await Promise.all([
        fetch(`/api/class-sections/${params.id}`, { cache: 'no-store' }),
        fetch('/api/teachers', { cache: 'no-store' }),
      ])

      const rowJson = await rowRes.json()
      const tJson = await teachersRes.json()

      if (!rowRes.ok) throw new Error(rowJson.error || 'Failed to load class section')
      if (!teachersRes.ok) throw new Error(tJson.error || 'Failed to load teachers')

      setTeachers(tJson.data || [])
      setTeacherId(rowJson.data.class_teacher_id ? String(rowJson.data.class_teacher_id) : '')

      setLoading(false)
    }

    load().catch((e) => {
      setError((e as Error).message)
      setLoading(false)
    })
  }, [params.id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/class-sections/${params.id}/assign-teacher`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: teacherId ? Number(teacherId) : null }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Failed to assign teacher')
      router.push('/admin/manageClasses')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => router.push('/admin/manageClasses')}
          className="text-blue-600 font-semibold hover:text-blue-800 mb-4"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold mb-6">Assign Teacher</h1>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Teacher</label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              disabled={saving}
              className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm text-gray-700 focus:outline-blue-500"
            >
              <option value="">Unassigned</option>
              {teachers.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </div>

          <button
            disabled={saving}
            className="w-full h-12 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              ❌ {error}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
