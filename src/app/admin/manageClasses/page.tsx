'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../components/ui/button'
import { ClassTable } from '../components/classTable'
import { ClassFilter, ClassFilters } from '../components/classFilter'

type ClassRow = {
  id: number
  classId: number
  sectionId: number
  className: string
  section: string
  teacherId: number | null
  teacher: string
  students: number
}

export default function ClassesPage() {
  const router = useRouter()

  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState<ClassFilters>({
    search: '',
    classId: '',
    sectionId: '',
  })

  const fetchClasses = async (f: ClassFilters) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (f.search) params.set('search', f.search)
      if (f.classId) params.set('classId', f.classId)
      if (f.sectionId) params.set('sectionId', f.sectionId)

      const res = await fetch(`/api/class-sections?${params.toString()}`, { cache: 'no-store' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to load classes')

      setClasses(result.data || [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClasses(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchClasses(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.classId, filters.sectionId])

  const classOptions = useMemo(() => {
    const map = new Map<number, string>()
    classes.forEach((c) => map.set(c.classId, c.className))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [classes])

  const sectionOptions = useMemo(() => {
    const map = new Map<number, string>()
    classes.forEach((c) => map.set(c.sectionId, c.section))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [classes])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this class section?')) return

    try {
      const res = await fetch(`/api/class-sections/${id}`, { method: 'DELETE' })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Failed to delete')

      await fetchClasses(filters)
      alert('Deleted successfully')
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <Button label="Add Class" href="/admin/manageClasses/addClass" />
      </div>

      <ClassFilter
        classOptions={classOptions}
        sectionOptions={sectionOptions}
        onFilterChange={setFilters}
      />

      {loading && (
        <div className="py-10 text-gray-600">Loading classes...</div>
      )}

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <ClassTable
          classes={classes.map((c) => ({
            id: c.id,
            className: c.className,
            section: c.section,
            teacher: c.teacher,
            students: c.students,
          }))}
          onEdit={(id) => router.push(`/admin/manageClasses/editClass/${id}`)}
          onDelete={handleDelete}
          onAssignTeacher={(id) => router.push(`/admin/manageClasses/assignTeacher/${id}`)}
        />
      )}

      {!loading && !error && classes.length === 0 && (
        <div className="py-10 text-gray-600">No class sections found.</div>
      )}
    </div>
  )
}
