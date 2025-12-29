'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TeacherHeader from './components/teacherHeader'

interface ClassData {
  id: number;
  className: string;
  section: string;
  subject: string;
}

export default function TeacherPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchClasses = async () => {
    setLoading(true);
    setError('');

    try {
      const storedUser = localStorage.getItem('user');
      
      if (!storedUser) {
        throw new Error('No login session found.');
      }

      const userObj = JSON.parse(storedUser);
      const teacherId = userObj.id;

      if (!teacherId) {
        throw new Error('User ID is missing from session.');
      }

      // Updated fetch URL
      const response = await fetch(`/api/teacher?id=${teacherId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch classes');
      }

      setClasses(result.data);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* 1. Add the Header here */}
      <TeacherHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">My Classes</h2>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="text-gray-600">Loading your classes...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-6">
            {error}
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-600">
                  <th className="py-4 px-6">Class</th>
                  <th className="py-4 px-6">Section</th>
                  <th className="py-4 px-6">Subject</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classes.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 text-gray-800 font-medium">
                      {item.className}
                    </td>
                    <td className="py-4 px-6 text-gray-800 font-medium">
                      {item.section}
                    </td>
                    <td className="py-4 px-6 text-gray-800">
                      {item.subject}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/teacher/classes/${item.id}`} 
                        className="text-slate-600 hover:text-blue-700 font-bold text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}

                {classes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500">
                      No classes assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}