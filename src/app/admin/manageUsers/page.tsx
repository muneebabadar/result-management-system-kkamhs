// File: app/admin/users/page.tsx
'use client'

import { useState } from 'react'
import { UserTable } from '../components/userTable'
import { UserFilter } from '../components/userFilter'
import { Button } from '../components/ui/button'

export default function UsersPage() {
  // Dummy user data. Replace with data from your database or API later.
  const [users] = useState([
    { id: 1, name: 'Fatima Khan', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Aisha Patel', role: 'Teacher', status: 'Active' },
    { id: 3, name: 'Zainab Ali', role: 'Teacher', status: 'Active' },
    { id: 4, name: 'Sarah Ahmed', role: 'Teacher', status: 'Active' },
    { id: 5, name: 'Hafsa Malik', role: 'Teacher', status: 'Active' },
    { id: 6, name: 'Ayesha Siddiqui', role: 'Teacher', status: 'Active' },
    { id: 7, name: 'Mariam Hussain', role: 'Teacher', status: 'Active' },
    { id: 8, name: 'Rukhsana Khan', role: 'Teacher', status: 'Active' },
    { id: 9, name: 'Nadia Mirza', role: 'Teacher', status: 'Active' },
    { id: 10, name: 'Sana Khan', role: 'Teacher', status: 'Active' },
  ])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <Button label="Add User" href="/admin/manageUsers/addUser" />
      </div>

      {/* Filter/Search Section */}
      <UserFilter onFilterChange={() => {}} />

      {/* User Table */}
      <UserTable users={users} onEdit={id => alert(`Edit user with id ${id}`)} onDelete={id => alert(`Delete user with id ${id}`)} />
    </div>
  )
}
