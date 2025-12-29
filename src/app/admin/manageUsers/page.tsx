'use client'

import { useState, useEffect } from 'react'
import { UserTable } from '../components/userTable'
import { UserFilter } from '../components/userFilter'
import { Button } from '../components/ui/button'

interface User {
  id: number; // Added back - needed for Edit/Delete
  name: string;
  email: string;
  role: string;
  status: boolean;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch users from API
  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/users');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch users');
      }

      setUsers(result.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      // Refresh the user list
      fetchUsers();
      alert('User deleted successfully');
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <Button label="Add User" href="/admin/manageUsers/addUser" />
      </div>

      {/* Filter/Search Section */}
      <UserFilter onFilterChange={() => {}} />

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
        <UserTable 
          users={users} 
          onEdit={id => alert(`Edit user with id ${id}`)} 
          onDelete={handleDelete}
        />
      )}

      {/* Empty State */}
      {!loading && !error && users.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          No users found. Click "Add User" to create one.
        </div>
      )}
    </div>
  )
}