'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Option = { id: number; name: string }

export default function EditClassSectionPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [classes, setClasses] = useState<Option[]>([])
  const [sections, setSections] = useState<Option[]>([])
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')

      const [rowRes, cRes, sRes] = await Promise.all([
        fetch(`/api/class-sections/${params.id}`, { cache: 'no-store' }),
        fetch('/api/classes', { cache: 'no-store' }),
        fetch('/api/sections', { cache: 'no-store' }),
      ])

      const rowJson = await rowRes.json()
      const cJson = await cRes.json()
      const sJson = await sRes.json()

      if (!rowRes.ok) throw new Error(rowJson.error || 'Failed to load record')

      setClasses(cJson.data || [])
      setSections(sJson.data || [])
      setClassId(String(rowJson.data.class_id))
      setSectionId(String(rowJson.data.section_id))

      setLoading(false)
    }

    load().catch((e) => {
      setError((e as Error).message)
      setLoading(false)
    })
  }, [params.id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/class-sections/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: Number(classId), sectionId: Number(sectionId) }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Failed to update')
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

        <h1 className="text-2xl font-bold mb-6">Edit Class</h1>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Class</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              required
              disabled={saving}
              className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm text-gray-700 focus:outline-blue-500"
            >
              {classes.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Section</label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              required
              disabled={saving}
              className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm text-gray-700 focus:outline-blue-500"
            >
              {sections.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
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
