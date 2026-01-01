'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StudentTable, StudentForTable } from '../components/studentTable'
import { StudentFilter } from '../components/studentFilter'
import { Button } from '../components/ui/button'
import { useSearchParams } from 'next/navigation'

type StudentFromDB = {
  id: number
  full_name: string
  class_id: number
  section_id: number
  contact_number: string | null
}

type Class = { id: number; name: string }
type Section = { id: number; name: string }

export default function ManageStudentsPage() {
  const router = useRouter()

  const [rawStudents, setRawStudents] = useState<StudentFromDB[]>([])
  const [students, setStudents] = useState<StudentForTable[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [sections, setSections] = useState<Section[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({
    name: '',
    classId: '',
    sectionId: '',
  })

const searchParams = useSearchParams()
const refreshKey = searchParams.get('refresh')

  /* ===============================
     Fetch data
  ================================ */
  const fetchAll = async () => {
    setLoading(true)
    try {
      const [s, c, sec] = await Promise.all([
        fetch('/api/students', { cache: 'no-store' }),
        fetch('/api/classes'),
        fetch('/api/sections'),
      ])
      const studentsJson = await s.json()
const classesJson = await c.json()
const sectionsJson = await sec.json()

setRawStudents(Array.isArray(studentsJson) ? studentsJson : studentsJson.data ?? [])
setClasses(Array.isArray(classesJson) ? classesJson : classesJson.data ?? [])
setSections(Array.isArray(sectionsJson) ? sectionsJson : sectionsJson.data ?? [])


      // setRawStudents((await s.json()).data || [])
      // setClasses((await c.json()).data || [])
      // setSections((await sec.json()).data || [])
    } catch {
      setError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [refreshKey])

  /* ===============================
     Maps
  ================================ */
  const classMap = useMemo(
    () => Object.fromEntries(classes.map(c => [c.id, c.name])),
    [classes]
  )

  const sectionMap = useMemo(
    () => Object.fromEntries(sections.map(s => [s.id, s.name])),
    [sections]
  )

  useEffect(() => {
    setStudents(
      rawStudents.map(s => ({
        id: s.id,
        name: s.full_name,
        class: classMap[s.class_id] || '—',
        section: sectionMap[s.section_id] || '—',
        parentPhone: s.contact_number ?? '',
      }))
    )
  }, [rawStudents, classMap, sectionMap])

  /* ===============================
     Filter handler
  ================================ */
  const handleFilterChange = (
    key: 'name' | 'classId' | 'sectionId',
    value: string
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      return (
        s.name.toLowerCase().includes(filters.name.toLowerCase()) &&
        (!filters.classId || s.class === filters.classId) &&
        (!filters.sectionId || s.section === filters.sectionId)
      )
    })
  }, [students, filters])

  /* ===============================
     Actions
  ================================ */
  const handleEdit = (id: number) =>
    router.push(`/admin/manageStudents/editStudent/${id}`)
    // router.push('/admin/manageStudents?refresh=1')


  const handleDelete = async (id: number) => {
    if (!confirm('Delete this student?')) return
    await fetch(`/api/students/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  /* ===============================
     Render
  ================================ */
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Students</h1>
        <Button label="Add Student" href="/admin/manageStudents/addStudent" />
      </div>

      {/* <StudentFilter onFilterChange={handleFilterChange} /> */}
      <StudentFilter
      classes={classes}
      sections={sections}
      onFilterChange={handleFilterChange}
    />

      {loading && <p>Loading students...</p>}
      {error && <p className="text-red-600">{error}</p>}

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
