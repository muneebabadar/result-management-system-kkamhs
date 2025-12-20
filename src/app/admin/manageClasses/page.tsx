'use client'

import { useState } from 'react'
import { Button } from '../components/ui/button'
import { ClassTable } from '../components/classTable'
import { ClassFilter } from '../components/classFilter'

export default function ClassesPage() {
  const [classes] = useState([
    { id: 1, className: '9', section: 'A', teacher: 'Ms. Fatima Khan', students: 30 },
    { id: 2, className: '9', section: 'B', teacher: 'Mr. Ahmed Raza', students: 28 },
    { id: 3, className: '10', section: 'A', teacher: 'Ms. Aisha Siddiqui', students: 32 },
    { id: 4, className: '10', section: 'B', teacher: 'Mr. Imran Ali', students: 31 },
    { id: 5, className: '11', section: 'A', teacher: 'Ms. Sana Malik', students: 29 },
  ])

  const [filters, setFilters] = useState({ search: '', className: '', section: '' })

  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = filters.search
      ? cls.teacher.toLowerCase().includes(filters.search.toLowerCase())
      : true
    const matchesClass = filters.className ? cls.className === filters.className : true
    const matchesSection = filters.section ? cls.section === filters.section : true
    return matchesSearch && matchesClass && matchesSection
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <Button label="Add Class" href="/admin/manageClasses/addClass" />
      </div>

      {/* Search & Filters */}
      <ClassFilter classes={classes} onFilterChange={setFilters} />

      {/* Table */}
      <ClassTable
        classes={filteredClasses}
        onEdit={(id) => alert(`Edit class with id ${id}`)}
        onDelete={(id) => alert(`Delete class with id ${id}`)}
        onAssignTeacher={(id) => alert(`Assign teacher for class with id ${id}`)}
      />
    </div>
  )
}
