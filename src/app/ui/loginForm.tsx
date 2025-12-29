"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: username,
          password: password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Invalid username or password');
        setLoading(false);
        return;
      }

    // 1. NORMALIZE THE ROLE (Handle 'Admin' vs 'admin')
      const userRole = result.user.role ? result.user.role.toLowerCase() : '';

      // 2. STORE USER SAFELY
      // We explicitly construct the object to ensure 'role' is saved in a way the Layout understands
      localStorage.setItem('user', JSON.stringify({
        ...result.user,
        role: userRole // Save as lowercase to match Layout checks
      }));

      // 3. REDIRECT BASED ON NORMALIZED ROLE
      if (userRole === 'admin') {
        router.push('/admin');
      } else if (userRole === 'teacher') {
        router.push('/teacher');
      } else {
        // Fallback for students or unknown roles
        router.push('/'); 
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      {/* Username */}
      <div>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          className="w-full h-14 rounded-xl bg-[#f0f2f5] px-4 text-base text-[#111418] placeholder:text-[#60758a] focus:outline-none disabled:opacity-50"
          required
        />
      </div>

      {/* Password */}
      <div>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="w-full h-14 rounded-xl bg-[#f0f2f5] px-4 text-base text-[#111418] placeholder:text-[#60758a] focus:outline-none disabled:opacity-50"
          required
        />
      </div>

      {/* Error Message */}
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      {/* Forgot Password */}
      <p className="text-[#60758a] text-sm text-right underline cursor-pointer">
        Forgot Password?
      </p>

      {/* Login Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-xl bg-[#0c7ff2] text-white text-sm font-bold tracking-wide hover:bg-[#096ad1] transition disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}