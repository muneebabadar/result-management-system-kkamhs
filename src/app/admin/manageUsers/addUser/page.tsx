'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function AddUser() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: '',
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (form.password !== form.confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (form.password.length < 8) { // Changed from 6 to 8
      setErrorMessage('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Calling API route...');
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          role: form.role,
          password: form.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.error || 'Failed to create user');
        setIsLoading(false);
        return;
      }

      console.log('User created:', result.data);
      setSuccessMessage('User registered successfully!');
      
      // Clear form
      setForm({
        fullName: '',
        email: '',
        role: '',
        password: '',
        confirmPassword: '',
      });

      setTimeout(() => {
        router.push('/admin/manageUsers');
      }, 2000);

    } catch (err) {
      console.error('Unexpected error:', err);
      setErrorMessage('An unexpected error occurred: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
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
            disabled={isLoading}
            className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm focus:outline-blue-500 disabled:opacity-50"
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
            disabled={isLoading}
            className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm focus:outline-blue-500 disabled:opacity-50"
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
            disabled={isLoading}
            className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm text-gray-700 focus:outline-blue-500 disabled:opacity-50"
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
            placeholder="Create password (min 8 characters)" // Updated
            required
            disabled={isLoading}
            className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm focus:outline-blue-500 disabled:opacity-50"
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
            disabled={isLoading}
            className="w-full h-12 px-4 rounded-xl bg-gray-100 text-sm focus:outline-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Register Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating...' : 'Register'}
        </button>

        {/* Error Message */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            ❌ {errorMessage}
          </div>
        )}

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