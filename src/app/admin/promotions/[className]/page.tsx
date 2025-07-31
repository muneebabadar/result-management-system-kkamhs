'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'

type Student = {
  name: string
  class: string
  section: string
  result: 'Pass' | 'Fail'
  status: 'Promoted' | 'Not Promoted'
}

const initialStudents: Student[] = [
  { name: 'Aisha Khan', class: 'Grade 6', section: 'A', result: 'Pass', status: 'Promoted' },
  { name: 'Fatima Hassan', class: 'Grade 6', section: 'A', result: 'Pass', status: 'Promoted' },
  { name: 'Zainab Malik', class: 'Grade 6', section: 'A', result: 'Pass', status: 'Promoted' },
  { name: 'Sara Ahmed', class: 'Grade 6', section: 'A', result: 'Pass', status: 'Promoted' },
  { name: 'Hafsa Ali', class: 'Grade 6', section: 'A', result: 'Pass', status: 'Promoted' },
  { name: 'Ayesha Siddiqui', class: 'Grade 6', section: 'A', result: 'Fail', status: 'Not Promoted' },
  { name: 'Rukhsana Iqbal', class: 'Grade 6', section: 'A', result: 'Fail', status: 'Not Promoted' },
  { name: 'Nadia Hussain', class: 'Grade 6', section: 'A', result: 'Fail', status: 'Not Promoted' },
  { name: 'Amira Khan', class: 'Grade 6', section: 'A', result: 'Fail', status: 'Not Promoted' },
  { name: 'Sana Malik', class: 'Grade 6', section: 'A', result: 'Fail', status: 'Not Promoted' },
]

export default function ClassPromotionPage() {
  const { class: classParam } = useParams()
  const router = useRouter()
  const className = decodeURIComponent(classParam as string)

  const [students, setStudents] = useState(initialStudents)
  const [conditionalPass, setConditionalPass] = useState<{ [key: string]: boolean }>({})

  const handleToggle = (studentName: string) => {
    setConditionalPass((prev) => ({
      ...prev,
      [studentName]: !prev[studentName],
    }))
  }

  const handleConfirmPromotions = () => {
    // ===============================
    // 👉 INSERT BACKEND LOGIC HERE
    // Example: Send `conditionalPass` + `className` to backend API
    // await fetch('/api/promotions/confirm', {
    //   method: 'POST',
    //   body: JSON.stringify({ class: className, updates: conditionalPass }),
    // })
    // ===============================
    console.log('Confirming promotions for:', className)
    console.log('Conditional Promotions:', conditionalPass)
    alert('Promotions confirmed!')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Promotion Eligibility - {className}
        </h1>
        <button
          onClick={() => router.back()}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-100 text-gray-700 text-left">
            <tr>
              <th className="px-6 py-3">Student Name</th>
              <th className="px-6 py-3">Class</th>
              <th className="px-6 py-3">Section</th>
              <th className="px-6 py-3">Overall Result</th>
              <th className="px-6 py-3">Promotion Status</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.name} className="hover:bg-gray-50">
                <td className="px-6 py-4">{student.name}</td>
                <td className="px-6 py-4">{student.class}</td>
                <td className="px-6 py-4">{student.section}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-md text-white ${
                      student.result === 'Pass' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    {student.result}
                  </span>
                </td>
                <td className="px-6 py-4">{student.status}</td>
                <td className="px-6 py-4">
                  {student.result === 'Fail' && (
                    <label className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!!conditionalPass[student.name]}
                        onChange={() => handleToggle(student.name)}
                      />
                      <span>Conditional Pass</span>
                    </label>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleConfirmPromotions}
        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Confirm Promotions
      </button>
    </div>
  )
}