'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import TeacherHeader from '@/app/teacher/components/teacherHeader'

interface Student {
  enrollment_id: number
  student_id: number
  roll_number: string
  full_name: string
  gr_no: string
}

interface Subject {
  id: number
  name: string
}

interface ExamComponent {
  id: number
  name: string
  max_marks: number
  sort_order: number
}

interface Exam {
  id: number
  name: string
  exam_type: string
  term: string | null
  exam_components: ExamComponent[]
}

interface MarkCell {
  obtained_marks: number | null
  is_absent: boolean
}

type MarksLookup = Record<string, Record<string, Record<string, MarkCell>>>

interface PageData {
  academic_year: { id: number; name: string }
  students: Student[]
  subjects: Subject[]
  exams: Exam[]
  marks_lookup: MarksLookup
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function ClassStudentsPage() {
  const params = useParams()
  const classId = params.class_id as string
  const sectionId = params.section_id as string

  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Local editable marks state: marks[studentId][subjectId][componentId]
  const [localMarks, setLocalMarks] = useState<MarksLookup>({})
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({})

  // UI state
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
  const [teacherId, setTeacherId] = useState<number | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const u = JSON.parse(storedUser)
      setTeacherId(u.id)
    }
  }, [])

  useEffect(() => {
    if (!teacherId) return

    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(
          `/api/teacher/studentGrades?class_id=${classId}&section_id=${sectionId}&teacher_id=${teacherId}`
        )
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Failed to fetch data')

        setData(result.data)
        setLocalMarks(result.data.marks_lookup ?? {})

        // Auto-select first subject and first exam
        if (result.data.subjects.length > 0) {
          setSelectedSubjectId(result.data.subjects[0].id)
        }
        if (result.data.exams.length > 0) {
          setSelectedExamId(result.data.exams[0].id)
        }
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [teacherId, classId, sectionId])

  const getMark = (studentId: number, subjectId: number, componentId: number): MarkCell => {
    return (
      localMarks?.[studentId]?.[subjectId]?.[componentId] ?? {
        obtained_marks: null,
        is_absent: false,
      }
    )
  }

  const updateLocalMark = (
    studentId: number,
    subjectId: number,
    componentId: number,
    field: 'obtained_marks' | 'is_absent',
    value: number | null | boolean
  ) => {
    setLocalMarks((prev) => {
      const next = { ...prev }
      if (!next[studentId]) next[studentId] = {}
      if (!next[studentId][subjectId]) next[studentId][subjectId] = {}
      next[studentId][subjectId][componentId] = {
        ...getMark(studentId, subjectId, componentId),
        [field]: value,
      }
      return next
    })
  }

  const saveMark = useCallback(
    async (studentId: number, subjectId: number, componentId: number) => {
      const key = `${studentId}_${subjectId}_${componentId}`
      const cell = localMarks?.[studentId]?.[subjectId]?.[componentId]
      if (!cell) return

      setSaveStatus((prev) => ({ ...prev, [key]: 'saving' }))

      try {
        const res = await fetch('/api/teacher/studentGrades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: studentId,
            subject_id: subjectId,
            exam_component_id: componentId,
            obtained_marks: cell.obtained_marks,
            is_absent: cell.is_absent,
          }),
        })
        if (!res.ok) {
          const r = await res.json()
          throw new Error(r.error)
        }
        setSaveStatus((prev) => ({ ...prev, [key]: 'saved' }))
        setTimeout(() => setSaveStatus((prev) => ({ ...prev, [key]: 'idle' })), 2000)
      } catch {
        setSaveStatus((prev) => ({ ...prev, [key]: 'error' }))
      }
    },
    [localMarks]
  )

  const selectedExam = data?.exams.find((e) => e.id === selectedExamId)
  const components = selectedExam
    ? [...selectedExam.exam_components].sort((a, b) => a.sort_order - b.sort_order)
    : []

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TeacherHeader />
        <div className="flex justify-center items-center py-32 text-gray-400 text-sm">
          Loading class data...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TeacherHeader />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        </main>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/teacher" className="hover:text-blue-600 transition-colors">
            My Classes
          </Link>
          <span>/</span>
          <span className="text-gray-800 font-medium">
            {/* We'll show class/section from data if available */}
            Class {classId} · Section {sectionId}
          </span>
          {data.academic_year && (
            <>
              <span>/</span>
              <span className="text-gray-500">{data.academic_year.name}</span>
            </>
          )}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Subject selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Subject
            </label>
            <div className="flex gap-2 flex-wrap">
              {data.subjects.map((subj) => (
                <button
                  key={subj.id}
                  onClick={() => setSelectedSubjectId(subj.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedSubjectId === subj.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {subj.name}
                </button>
              ))}
            </div>
          </div>

          {/* Exam selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Exam
            </label>
            <div className="flex gap-2 flex-wrap">
              {data.exams.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => setSelectedExamId(exam.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedExamId === exam.id
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-slate-400'
                  }`}
                >
                  {exam.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* No subject/exam selected */}
        {(!selectedSubjectId || !selectedExamId) && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            Please select a subject and an exam above to enter marks.
          </div>
        )}

        {/* Marks Table */}
        {selectedSubjectId && selectedExamId && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            {components.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">
                No exam components found for this exam.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                      #
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      GR No.
                    </th>
                    {components.map((comp) => (
                      <th
                        key={comp.id}
                        className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center"
                      >
                        <div>{comp.name}</div>
                        <div className="text-gray-400 font-normal normal-case">
                          / {comp.max_marks}
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.students.map((student, idx) => (
                    <tr key={student.student_id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{student.full_name}</div>
                        {student.roll_number && (
                          <div className="text-xs text-gray-400">Roll: {student.roll_number}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500">{student.gr_no || '—'}</td>

                      {components.map((comp) => {
                        const cell = getMark(student.student_id, selectedSubjectId, comp.id)
                        const key = `${student.student_id}_${selectedSubjectId}_${comp.id}`
                        const status = saveStatus[key] ?? 'idle'

                        return (
                          <td key={comp.id} className="py-2 px-3 text-center">
                            {cell.is_absent ? (
                              <span className="inline-block px-2 py-1 bg-red-50 text-red-500 text-xs rounded font-medium">
                                Absent
                              </span>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                max={comp.max_marks}
                                value={cell.obtained_marks ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : Number(e.target.value)
                                  updateLocalMark(
                                    student.student_id,
                                    selectedSubjectId,
                                    comp.id,
                                    'obtained_marks',
                                    val
                                  )
                                }}
                                onBlur={() => saveMark(student.student_id, selectedSubjectId, comp.id)}
                                className={`w-20 text-center border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${
                                  status === 'error'
                                    ? 'border-red-400 bg-red-50'
                                    : status === 'saved'
                                    ? 'border-green-400 bg-green-50'
                                    : 'border-gray-300'
                                }`}
                                placeholder="—"
                              />
                            )}
                          </td>
                        )
                      })}

                      {/* Absent toggles per student (one toggle covers all components for that student in this exam) */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {components.map((comp) => {
                            const cell = getMark(student.student_id, selectedSubjectId, comp.id)
                            return (
                              <label
                                key={comp.id}
                                className="flex items-center gap-1 cursor-pointer text-xs text-gray-500"
                              >
                                <input
                                  type="checkbox"
                                  checked={cell.is_absent}
                                  onChange={(e) => {
                                    updateLocalMark(
                                      student.student_id,
                                      selectedSubjectId,
                                      comp.id,
                                      'is_absent',
                                      e.target.checked
                                    )
                                    // Auto-save absence toggle
                                    setTimeout(
                                      () => saveMark(student.student_id, selectedSubjectId, comp.id),
                                      100
                                    )
                                  }}
                                  className="accent-red-500"
                                />
                                {comp.name}
                              </label>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {data.students.length === 0 && (
                    <tr>
                      <td
                        colSpan={3 + components.length + 1}
                        className="py-16 text-center text-gray-400 text-sm"
                      >
                        No students enrolled in this class for the current academic year.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Save hint */}
        {selectedSubjectId && selectedExamId && data.students.length > 0 && (
          <p className="mt-3 text-xs text-gray-400 text-right">
            Marks are saved automatically when you leave each input field.
          </p>
        )}
      </main>
    </div>
  )
}
