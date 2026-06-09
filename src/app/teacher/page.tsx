'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import TeacherHeader from '@/app/teacher/components/teacherHeader'

interface AssignedClass {
  class_section_key: string
  class_id: number
  section_id: number
  class_name: string
  section_name: string
  subjects: string[]
}

export default function TeacherPage() {
  const [classes, setClasses] = useState<AssignedClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const storedUser = localStorage.getItem('user')
        if (!storedUser) throw new Error('No login session found.')

        const userObj = JSON.parse(storedUser)
        const teacherId = userObj.id
        if (!teacherId) throw new Error('User ID missing from session.')

        const res = await fetch(`/api/teacher/classes?teacher_id=${teacherId}`)
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Failed to fetch classes')

        setClasses(result.data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchClasses()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">My Classes</h2>
          <p className="text-sm text-gray-500 mt-1">Select a class to enter student marks</p>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="text-gray-400 text-sm">Loading your classes...</div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Section</th>
                  <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subjects</th>
                  <th className="py-3 px-6 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classes.map((item) => (
                  <tr key={item.class_section_key} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 font-medium text-gray-900">{item.class_name}</td>
                    <td className="py-4 px-6 text-gray-700">{item.section_name}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5">
                        {item.subjects.map((subj) => (
                          <span
                            key={subj}
                            className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
                          >
                            {subj}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/teacher/classes/${item.class_id}/${item.section_id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Enter marks →
                      </Link>
                    </td>
                  </tr>
                ))}

                {classes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-gray-400 text-sm">
                      No classes assigned to you yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
