'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

type User = {
  id: number
  name: string
  email: string
  role: string
  status: boolean
}

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [form, setForm] = useState<User>({
    id: Number(params.id),
    name: '',
    email: '',
    role: 'Teacher',
    status: true,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setErrorMessage('')
      try {
        const res = await fetch(`/api/users/${params.id}`, { cache: 'no-store' })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Failed to load user')

        const u = result.data as User
        setForm({
          id: u.id,
          name: u.name ?? '',
          email: u.email ?? '',
          role: u.role ?? 'Teacher',
          status: !!u.status,
        })
      } catch (e) {
        setErrorMessage((e as Error).message)
      } finally {
        setLoading(false)
      }
    }

    if (params?.id) load()
  }, [params?.id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleToggleStatus = () => {
    setForm((prev) => ({ ...prev, status: !prev.status }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setSaving(true)

    try {
      const res = await fetch(`/api/users/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          role: form.role,
          status: form.status,
        }),
      })

      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Failed to update user')

      setSuccessMessage('User updated successfully!')
      setTimeout(() => router.push('/admin/manageUsers'), 1200)
    } catch (e) {
      setErrorMessage((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => router.push('/admin/manageUsers')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading user...
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
      <div className="w-full max-w-3xl mb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-800 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Users
        </button>
      </div>

      <h1 className="text-2xl font-bold text-center mb-6">Edit User</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            disabled={saving}
            className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm focus:outline-blue-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            disabled={saving}
            className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm focus:outline-blue-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            required
            disabled={saving}
            className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm text-gray-700 focus:outline-blue-500 disabled:opacity-50"
          >
            <option value="Admin">Admin</option>
            <option value="Teacher">Teacher</option>
          </select>
        </div>

        <div className="flex items-center justify-between bg-gray-50 border rounded-xl px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-gray-800">Status</div>
            <div className="text-xs text-gray-600">{form.status ? 'Active' : 'Inactive'}</div>
          </div>
          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-50"
          >
            Toggle
          </button>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        {errorMessage && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            ❌ {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-4 flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle size={18} />
            {successMessage}
          </div>
        )}
      </form>
    </div>
  )
}
