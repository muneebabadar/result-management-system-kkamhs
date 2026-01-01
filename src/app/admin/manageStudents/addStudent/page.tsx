'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Class = {
  id: number
  name: string
}

type Section = {
  id: number
  name: string
}

export default function AddStudentPage() {
  const router = useRouter()

  const [classes, setClasses] = useState<Class[]>([])
  const [sections, setSections] = useState<Section[]>([])

  const [form, setForm] = useState({
    name: '',
    dob: '',
    gender: '',
    classId: '',
    sectionId: '',
    rollNumber: '',
    admissionDate: '',
    fatherName: '',
    motherName: '',
    address: '',
    contactNumber: '',
    email: '',
  })

  /* ===============================
     Fetch Classes & Sections
  ================================ */
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [classesRes, sectionsRes] = await Promise.all([
          fetch('/api/classes'),
          fetch('/api/sections'),
        ])

        const classesJson = await classesRes.json()
        const sectionsJson = await sectionsRes.json()

        setClasses(Array.isArray(classesJson) ? classesJson : classesJson.data ?? [])
        setSections(Array.isArray(sectionsJson) ? sectionsJson : sectionsJson.data ?? [])
      } catch (err) {
        console.error('Failed to fetch classes/sections', err)
      }
    }

    fetchMeta()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name || !form.classId || !form.sectionId) {
      alert('Student name, class, and section are required')
      return
    }

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.name,
          dob: form.dob || null,
          gender: form.gender || null,
          class_id: Number(form.classId),
          section_id: Number(form.sectionId),
          roll_number: form.rollNumber || null,
          admission_date: form.admissionDate || null,
          father_name: form.fatherName || null,
          mother_name: form.motherName || null,
          address: form.address || null,
          contact_number: form.contactNumber || null,
          email: form.email || null,
          status: true,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add student')
      }

      alert('Student added successfully!')
      router.push('/admin/manageStudents?refresh=' + Date.now())
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Something went wrong')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow rounded-md mt-8">
      <button
        onClick={() => router.push('/admin/manageStudents')}
        className="text-blue-600 font-semibold mb-4"
        type="button"
      >
        ← Back to Students
      </button>

      <h1 className="text-2xl font-bold mb-4">Student Details</h1>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormInput label="Student Name" name="name" value={form.name} onChange={handleChange} />

        <FormInput label="Date of Birth" name="dob" type="date" value={form.dob} onChange={handleChange} />
        <FormInput label="Gender" name="gender" value={form.gender} onChange={handleChange} />

        <div>
          <label className="block text-sm font-medium mb-1">Class</label>
          <select
            name="classId"
            value={form.classId}
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
            name="sectionId"
            value={form.sectionId}
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

        <FormInput label="Roll Number" name="rollNumber" value={form.rollNumber} onChange={handleChange} />
        <FormInput label="Admission Date" name="admissionDate" type="date" value={form.admissionDate} onChange={handleChange} />
        <FormInput label="Father's Name" name="fatherName" value={form.fatherName} onChange={handleChange} />
        <FormInput label="Mother's Name" name="motherName" value={form.motherName} onChange={handleChange} />
        <FormInput label="Address" name="address" value={form.address} onChange={handleChange} />
        <FormInput label="Contact Number" name="contactNumber" value={form.contactNumber} onChange={handleChange} />
        <FormInput label="Email" name="email" type="email" value={form.email} onChange={handleChange} />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Add Student
        </button>
      </form>
    </div>
  )
}

function FormInput({
  label,
  name,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border px-3 py-2 rounded focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}
