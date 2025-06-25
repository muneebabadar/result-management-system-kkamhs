import Image from "next/image";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        {/* Login Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">

            {/* Logo */}
            <div className="flex justify-center">
            <Image
                src="/logo.jpg" 
                alt="School Logo"
                width={80}
                height={80}
                className="rounded-full"
            />
            </div>

            {/* School Name */}
            <h2 className="text-center text-xl font-semibold text-gray-900">
            Khadija Kazi Ali Memorial High School
            </h2>

            {/* Heading */}
            <h3 className="text-center font-bold text-gray-700">
            Login to Your Account
            </h3>

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
    </div>
  );
}
