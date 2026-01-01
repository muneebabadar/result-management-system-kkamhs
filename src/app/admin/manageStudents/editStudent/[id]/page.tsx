'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

type Class = { id: number; name: string }
type Section = { id: number; name: string }

export default function EditStudentPage() {
  const router = useRouter()
  const { id } = useParams()

  const [classes, setClasses] = useState<Class[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    full_name: '',
    class_id: '',
    section_id: '',
    contact_number: '',
  })

  /* ===============================
     Fetch student + meta
  ================================ */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentRes, classRes, sectionRes] = await Promise.all([
          fetch(`/api/students/${id}`),
          fetch('/api/classes'),
          fetch('/api/sections'),
        ])

        const studentJson = await studentRes.json()
        const classJson = await classRes.json()
        const sectionJson = await sectionRes.json()

        const student = studentJson.data

        setForm({
          full_name: student.full_name ?? '',
          class_id: String(student.class_id),
          section_id: String(student.section_id),
          contact_number: student.contact_number ?? '',
        })

        setClasses(classJson.data ?? [])
        setSections(sectionJson.data ?? [])
      } catch (err) {
        alert('Failed to load student')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  /* ===============================
     Handlers
  ================================ */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.full_name,
           classId: Number(form.class_id),
          sectionId: Number(form.section_id),
          contactNumber: form.contact_number,
          status: true,
        }),
      })

      const result = await res.json()

      if (!res.ok) throw new Error(result.error)

      alert('Student updated successfully')
      // router.push('/admin/manageStudents?refresh=' + Date.now())
      router.push('/admin/manageStudents?refresh=1')

    } catch (err: any) {
      alert(err.message || 'Update failed')
    }
  }

  if (loading) return <p className="p-6">Loading...</p>

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-4">Edit Student</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="full_name"
          value={form.full_name}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          placeholder="Student Name"
          required
        />

        <select
          name="class_id"
          value={form.class_id}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          required
        >
          <option value="">Select Class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          name="section_id"
          value={form.section_id}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          required
        >
          <option value="">Select Section</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          name="contact_number"
          value={form.contact_number}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          placeholder="Contact Number"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          Save Changes
        </button>
      </form>
    </div>
  )
}
