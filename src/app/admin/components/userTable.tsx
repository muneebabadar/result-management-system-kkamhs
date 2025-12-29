'use client'

import React from 'react'

type User = {
  id: number
  name: string
  email: string
  role: string
  status: boolean
  created_at: string
}

export function UserTable({
  users,
  onEdit,
  onDelete,
}: {
  users: User[]
  onEdit: (id: number) => void
  onDelete: (id: number) => void
}) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left font-semibold px-6 py-4">NAME</th>
              <th className="text-left font-semibold px-6 py-4">EMAIL</th>
              <th className="text-left font-semibold px-6 py-4">ROLE</th>
              <th className="text-left font-semibold px-6 py-4">STATUS</th>
              <th className="text-left font-semibold px-6 py-4">CREATED AT</th>
              <th className="text-left font-semibold px-6 py-4">ACTIONS</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-900">{u.name}</td>
                <td className="px-6 py-4 text-gray-700">{u.email}</td>
                <td className="px-6 py-4 text-gray-700">{u.role}</td>
                <td className="px-6 py-4">
                  <StatusPill active={u.status} />
                </td>
                <td className="px-6 py-4 text-gray-700">{formatCreatedAt(u.created_at)}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => onEdit(u.id)}
                    className="text-blue-600 hover:underline mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(u.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  No users to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
        active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700',
      ].join(' ')}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function formatCreatedAt(createdAt: string) {
  // createdAt from Supabase is typically ISO; your screenshot shows a friendly format.
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return createdAt

  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  })
}
