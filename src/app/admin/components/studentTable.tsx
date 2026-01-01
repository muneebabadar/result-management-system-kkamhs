'use client'

import React from 'react'

export type StudentForTable = {
  id: number
  name: string
  class: string
  section: string
  parentPhone: string
}

type StudentTableProps = {
  students: StudentForTable[]
  onEdit: (id: number) => void
  onDelete: (id: number) => void
}

export function StudentTable({ students, onEdit, onDelete }: StudentTableProps) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left font-semibold px-6 py-4">NAME</th>
              <th className="text-left font-semibold px-6 py-4">CLASS</th>
              <th className="text-left font-semibold px-6 py-4">SECTION</th>
              <th className="text-left font-semibold px-6 py-4">CONTACT</th>
              <th className="text-left font-semibold px-6 py-4">ACTIONS</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-900">{s.name}</td>
                <td className="px-6 py-4 text-gray-700">{s.class}</td>
                <td className="px-6 py-4 text-gray-700">{s.section}</td>
                <td className="px-6 py-4 text-gray-700">{s.parentPhone}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => onEdit(s.id)}
                    className="text-blue-600 hover:underline mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(s.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                  No students to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}