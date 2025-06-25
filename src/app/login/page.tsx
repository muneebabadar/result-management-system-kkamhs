export default function Login() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
      {/* Heading */}
      <h1 className="text-black text-2xl font-bold mb-6">Login to Your Account</h1>

      {/* Input Container */}
      <div className="w-full max-w-md space-y-4">
        {/* Username */}
        <div>
          <input
            type="text"
            placeholder="Username"
            className="w-full h-14 rounded-xl bg-[#f0f2f5] px-4 text-base text-[#111418] placeholder:text-[#60758a] focus:outline-none"
          />
        </div>

        {/* Password */}
        <div>
          <input
            type="password"
            placeholder="Password"
            className="w-full h-14 rounded-xl bg-[#f0f2f5] px-4 text-base text-[#111418] placeholder:text-[#60758a] focus:outline-none"
          />
        </div>

        {/* Forgot Password */}
        <p className="text-[#60758a] text-sm text-right underline cursor-pointer">
          Forgot Password?
        </p>

        {/* Login Button */}
        <button className="w-full h-12 rounded-xl bg-[#0c7ff2] text-white text-sm font-bold tracking-wide hover:bg-[#096ad1] transition">
          Login
        </button>
      </div>
    </div>
  );
}
