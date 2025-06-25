// File: app/admin/manageUsers/addUser/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function AddUser() {
  const router = useRouter();

  // Form state
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: '',
  });

  const [successMessage, setSuccessMessage] = useState('');

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    // TODO: Connect this to your backend/database API to actually create the user
    console.log('Creating user:', form);

    // Mock success flow
    setSuccessMessage('User registered successfully!');
    setTimeout(() => {
      router.push('/admin/manageUsers');
    }, 2000);
  };

   const handleBack = () => {
    router.push('/admin/manageUsers');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
      {/* Back Button */}
      <div className="w-full max-w-3xl mb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-800 transition"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Users
        </button>
      </div>


        <h1 className="text-2xl font-bold text-center mb-6">Create New User</h1>

        {/* Success Message */}
        {/* {success && (
            <div className="mb-4 w-full max-w-md bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            ✅ User registered successfully. Redirecting...
            </div>
        )} */}

        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Enter full name"
              required
              className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm focus:outline-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter email"
              required
              className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm focus:outline-blue-500"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              required
              className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm text-gray-700 focus:outline-blue-500"
            >
              <option value="">Select Role</option>
              <option value="Admin">Admin</option>
              <option value="Teacher">Teacher</option>
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Create password"
              required
              className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm focus:outline-blue-500"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              required
              className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm focus:outline-blue-500"
            />
          </div>

          {/* Register Button */}
          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            Register
          </button>

          {/* Success Message */}
          {successMessage && (
            <div className="mt-4 flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={18} />
              {successMessage}
            </div>
          )}
        </form>
    </div>
  );
}
