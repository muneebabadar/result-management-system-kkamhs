import Image from "next/image";
import { Suspense } from "react";
import LoginForm from "../ui/loginForm";

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
            <Suspense>
                <LoginForm/>
            </Suspense>
        </div>
    </div>
  );
}
