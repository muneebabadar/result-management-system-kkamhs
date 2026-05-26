'use client'
// /src/app/admin/manageStudents/page.tsx

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StudentTable, StudentForTable } from '../components/studentTable'
import { StudentFilter } from '../components/studentFilter'
import { Button } from '../components/ui/button'

type Enrollment = {
  roll_number:    string | null
  class_id:       number
  section_id:     number
  class_section_id: number | null
  classes:  { id: number; name: string } | null
  sections: { id: number; name: string } | null
}

type StudentFromDB = {
  id:                  number
  full_name:           string
  gr_no:               string | null
  contact_number:      string | null
  status:              boolean
  student_enrollments: Enrollment[]
}

type Class   = { id: number; name: string }
type Section = { id: number; name: string }

export default function ManageStudentsPage() {
  const router = useRouter()

  const [rawStudents, setRawStudents] = useState<StudentFromDB[]>([])
  const [students,    setStudents]    = useState<StudentForTable[]>([])
  const [classes,     setClasses]     = useState<Class[]>([])
  const [sections,    setSections]    = useState<Section[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')

  const [filters, setFilters] = useState({ name: '', classId: '', sectionId: '' })

  const searchParams = useSearchParams()
  const refreshKey   = searchParams.get('refresh')

  /* ── Fetch ── */
  const fetchAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [s, c, sec] = await Promise.all([
        fetch('/api/students',  { cache: 'no-store' }),
        fetch('/api/classes',   { cache: 'no-store' }),
        fetch('/api/sections',  { cache: 'no-store' }),
      ])

      const studentsJson = await s.json()
      const classesJson  = await c.json()
      const sectionsJson = await sec.json()

      setRawStudents(Array.isArray(studentsJson) ? studentsJson : studentsJson.data ?? [])
      setClasses(Array.isArray(classesJson)      ? classesJson  : classesJson.data  ?? [])
      setSections(Array.isArray(sectionsJson)    ? sectionsJson : sectionsJson.data ?? [])
    } catch {
      setError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [refreshKey])

  /* ── Map raw → display ── */
  useEffect(() => {
    setStudents(
      rawStudents.map(s => {
        const enroll = s.student_enrollments?.[0]
        return {
          id:          s.id,
          name:        s.full_name,
          class:       enroll?.classes?.name  ?? '—',
          section:     enroll?.sections?.name ?? '—',
          parentPhone: s.contact_number ?? '',
        }
      })
    )
  }, [rawStudents])

  /* ── Filter ── */
  const handleFilterChange = (key: 'name' | 'classId' | 'sectionId', value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const filteredStudents = useMemo(() => {
    return students.filter(s =>
      s.name.toLowerCase().includes(filters.name.toLowerCase()) &&
      (!filters.classId   || s.class   === filters.classId)    &&
      (!filters.sectionId || s.section === filters.sectionId)
    )
  }, [students, filters])

  /* ── Actions ── */
  const handleEdit = (id: number) =>
    router.push(`/admin/manageStudents/editStudent/${id}`)

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this student?')) return
    await fetch(`/api/students/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  /* ── Render ── */
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Students</h1>
        <Button label="Add Student" href="/admin/manageStudents/addStudent" />
      </div>

      <StudentFilter
        classes={classes}
        sections={sections}
        onFilterChange={handleFilterChange}
      />

      {loading && <p>Loading students...</p>}
      {error   && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <StudentTable
          students={filteredStudents}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}