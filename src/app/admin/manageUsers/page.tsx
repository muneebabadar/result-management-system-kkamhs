'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserTable } from '../components/userTable'
import { UserFilter, UserFilters } from '../components/userFilter'
import { Button } from '../components/ui/button'

interface User {
  id: number
  name: string
  email: string
  role: string
  status: boolean
  created_at: string
}

export default function UsersPage() {
  const router = useRouter()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'All',
  })

  // Fetch users from API
  const fetchUsers = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/users', { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch users')
      }

      setUsers(result.data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    const role = filters.role

    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)

      const matchesRole =
        role === 'All' || u.role.toLowerCase() === role.toLowerCase()

      return matchesSearch && matchesRole
    })
  }, [users, filters])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      await fetchUsers()
      alert('User deleted successfully')
    } catch (err) {
      console.error('Error deleting user:', err)
      alert((err as Error).message || 'Failed to delete user')
    }
  }

  const handleEdit = (id: number) => {
    router.push(`/admin/manageUsers/editUser/${id}`)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <Button label="Add User" href="/admin/manageUsers/addUser" />
      </div>

      {/* Filter/Search Section */}
      <UserFilter onFilterChange={setFilters} />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading users...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {/* User Table */}
      {!loading && !error && (
        <UserTable users={filteredUsers} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {/* Empty State (based on FILTERED results) */}
      {!loading && !error && filteredUsers.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          No users found. Adjust your filters or click &quot;Add User&quot; to create one.
        </div>
      )}
    </div>
  )
}
