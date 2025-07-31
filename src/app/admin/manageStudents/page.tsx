'use client'

import { useState, useMemo } from 'react'
import { StudentTable } from '../components/studentTable'
import { StudentFilter } from '../components/studentFilter'
import { Button } from '../components/ui/button'

type Student = {
  id: number
  name: string
  class: string
  section: string
  parentPhone: string
}

export default function ManageStudentsPage() {
  const [students] = useState<Student[]>([
    { id: 1, name: 'Ali Raza', class: '5', section: 'A', parentPhone: '0300-1234567' },
    { id: 2, name: 'Fatima Noor', class: '6', section: 'B', parentPhone: '0312-7654321' },
    { id: 3, name: 'Ahmed Khan', class: '5', section: 'C', parentPhone: '0333-1122334' },
    { id: 4, name: 'Hira Yousuf', class: '7', section: 'A', parentPhone: '0345-9988776' },
    { id: 5, name: 'Zainab Tariq', class: '6', section: 'A', parentPhone: '0321-4433221' },
  ])

  const [filters, setFilters] = useState({
    name: '',
    class: '',
    section: '',
  })

  const handleFilterChange = (value: string) => {
    // Determine if it's a name, class, or section input based on value
    if (!isNaN(Number(value))) {
      setFilters((prev) => ({ ...prev, class: value }))
    } else if (['A', 'B', 'C'].includes(value.toUpperCase())) {
      setFilters((prev) => ({ ...prev, section: value }))
    } else {
      setFilters((prev) => ({ ...prev, name: value }))
    }
  }

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesName = student.name.toLowerCase().includes(filters.name.toLowerCase())
      const matchesClass = filters.class ? student.class === filters.class : true
      const matchesSection = filters.section
        ? student.section.toLowerCase() === filters.section.toLowerCase()
        : true
      return matchesName && matchesClass && matchesSection
    })
  }, [students, filters])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <Button label="Add Student" href="/admin/manageStudents/addStudent" />
      </div>

      <StudentFilter onFilterChange={handleFilterChange} />

      <StudentTable
        students={filteredStudents}
        onView={(id) => alert(`View student with id ${id}`)}
      />
    </div>
  )
}
