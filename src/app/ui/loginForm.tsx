// src/ui/loginForm.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      redirect: false,
      email: username, // Map username to email for NextAuth Credentials
      password,
    });

    if (result?.error) {
      setError("Invalid username or password");
    } else {
      router.push("/dashboard"); // Redirect to dashboard or role-based route
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
          className="w-full h-14 rounded-xl bg-[#f0f2f5] px-4 text-base text-[#111418] placeholder:text-[#60758a] focus:outline-none"
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
          className="w-full h-14 rounded-xl bg-[#f0f2f5] px-4 text-base text-[#111418] placeholder:text-[#60758a] focus:outline-none"
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
        className="w-full h-12 rounded-xl bg-[#0c7ff2] text-white text-sm font-bold tracking-wide hover:bg-[#096ad1] transition"
      >
        Login
      </button>
    </form>
  );
}