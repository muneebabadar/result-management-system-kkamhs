'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AddStudentPage() {

    const router = useRouter();
    const [form, setForm] = useState({
        name: '',
        dob: '',
        gender: '',
        class: '',
        section: '',
        rollNumber: '',
        admissionDate: '',
        fatherName: '',
        motherName: '',
        address: '',
        contactNumber: '',
        email: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // ============================
      // 👉 INSERT BACKEND LOGIC HERE
      // You can POST this data to your API route or backend here.
      // Example:
      //
      // const response = await fetch('/api/students', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(form),
      // })
      //
      // const result = await response.json()
      // if (!response.ok) throw new Error(result.message)
      //
      // ============================

      console.log('Submitting student data:', form)
      alert('Student added successfully!')
    } catch (error) {
      console.error('Submission failed:', error)
      alert('Something went wrong while adding the student.')
    }
  }

  const handleBack = () => {
    router.push('/admin/manageStudents');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow rounded-md mt-8">
    {/* Back Button */}
      <div className="w-full max-w-3xl mb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-800 transition"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Students
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-2 text-gray-800">Student Details</h1>
      <p className="text-sm text-gray-500 mb-6">Manage student information and academic records.</p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormInput label="Student Name" name="name" value={form.name} onChange={handleChange} />
        <FormInput label="Date of Birth" name="dob" type="date" value={form.dob} onChange={handleChange} />
        <FormInput label="Gender" name="gender" value={form.gender} onChange={handleChange} />
        <FormInput label="Class" name="class" value={form.class} onChange={handleChange} />
        <FormInput label="Section" name="section" value={form.section} onChange={handleChange} />
        <FormInput label="Roll Number" name="rollNumber" value={form.rollNumber} onChange={handleChange} />
        <FormInput label="Admission Date" name="admissionDate" type="date" value={form.admissionDate} onChange={handleChange} />
        <FormInput label="Father's Name" name="fatherName" value={form.fatherName} onChange={handleChange} />
        <FormInput label="Mother's Name" name="motherName" value={form.motherName} onChange={handleChange} />
        <FormInput label="Address" name="address" value={form.address} onChange={handleChange} />
        <FormInput label="Contact Number" name="contactNumber" value={form.contactNumber} onChange={handleChange} />
        <FormInput label="Email" name="email" type="email" value={form.email} onChange={handleChange} />

        <button
          type="submit"
          className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
        >
          Add Student
        </button>
      </form>
    </div>
  )
}

// Reusable input field
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
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 px-4 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}
