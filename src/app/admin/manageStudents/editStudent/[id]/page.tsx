'use client'
// /src/app/admin/manageStudents/editStudent/[id]/page.tsx

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

type Class   = { id: number; name: string }
type Section = { id: number; name: string }

export default function EditStudentPage() {
  const router      = useRouter()
  const { id }      = useParams()

  const [classes,  setClasses]  = useState<Class[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading,  setLoading]  = useState(true)

  const [form, setForm] = useState({
    full_name:      '',
    class_id:       '',
    section_id:     '',
    roll_number:    '',
    contact_number: '',
  })

  /* ── Fetch student + dropdowns ── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentRes, classRes, sectionRes] = await Promise.all([
          fetch(`/api/students/${id}`),
          fetch('/api/classes'),
          fetch('/api/sections'),
        ])

        const studentJson = await studentRes.json()
        const classJson   = await classRes.json()
        const sectionJson = await sectionRes.json()

        const student = studentJson.data
        const enroll  = student?.student_enrollments?.[0]

        setForm({
          full_name:      student?.full_name      ?? '',
          class_id:       String(enroll?.class_id  ?? ''),
          section_id:     String(enroll?.section_id ?? ''),
          roll_number:    enroll?.roll_number      ?? '',
          contact_number: student?.contact_number  ?? '',
        })

        setClasses(Array.isArray(classJson)   ? classJson   : classJson.data   ?? [])
        setSections(Array.isArray(sectionJson) ? sectionJson : sectionJson.data ?? [])
      } catch {
        alert('Failed to load student')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  /* ── Handlers ── */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/students/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:      form.full_name,
          contact_number: form.contact_number || null,
          class_id:       Number(form.class_id),
          section_id:     Number(form.section_id),
          roll_number:    form.roll_number || null,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Update failed')

      alert('Student updated successfully')
      router.push('/admin/manageStudents?refresh=' + Date.now())
    } catch (err: any) {
      alert(err.message || 'Update failed')
    }
  }

  if (loading) return <p className="p-6">Loading...</p>

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow rounded mt-8">
      <button
        type="button"
        onClick={() => router.push('/admin/manageStudents')}
        className="text-blue-600 font-semibold mb-4"
      >
        ← Back to Students
      </button>

      <h1 className="text-2xl font-bold mb-6">Edit Student</h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        <FormInput
          label="Student Name"
          name="full_name"
          value={form.full_name}
          onChange={handleChange}
          required
        />

        <div>
          <label className="block text-sm font-medium mb-1">Class</label>
          <select
            name="class_id"
            value={form.class_id}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">Select Class</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Section</label>
          <select
            name="section_id"
            value={form.section_id}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">Select Section</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <FormInput
          label="Roll Number"
          name="roll_number"
          value={form.roll_number}
          onChange={handleChange}
        />

        <FormInput
          label="Contact Number"
          name="contact_number"
          value={form.contact_number}
          onChange={handleChange}
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Save Changes
        </button>
      </form>
    </div>
  )
}

function FormInput({
  label, name, value, onChange, required = false,
}: {
  label:     string
  name:      string
  value:     string
  onChange:  (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full border px-3 py-2 rounded focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}