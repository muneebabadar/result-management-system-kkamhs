export default function SignUp() {
    return(
        <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
        {/* Heading */}
        <h1 className="text-black text-2xl font-bold mb-6">Create New User</h1>

        {/* Input Container */}
        <div className="w-full max-w-md space-y-4">
            {/* Full Name */}
            <div>
            <p className="font-semibold, text-[#48494a]">Full Name</p>
            <input
                type="text"
                placeholder="Full Name"
                className="w-full h-14 rounded-xl bg-[#f0f2f5] px-4 text-base text-[#111418] placeholder:text-[#60758a] focus:outline-none"
            />
            </div>

            {/* Email */}
            <div>
            <p className="font-semibold, text-[#48494a]">Email</p>
            <input
                type="text"
                placeholder="Email"
                className="w-full h-14 rounded-xl bg-[#f0f2f5] px-4 text-base text-[#111418] placeholder:text-[#60758a] focus:outline-none"
            />
            </div>

            {/* Role */}
            <div>
            <p className="font-semibold, text-[#48494a]">Role</p>
            <input
                type="text"
                placeholder="Role"
                className="w-full h-14 rounded-xl bg-[#f0f2f5] px-4 text-base text-[#111418] placeholder:text-[#60758a] focus:outline-none"
            />
            </div>

            {/* Password */}
            <div>
            <p className="font-semibold, text-[#48494a]">Password</p>
            <input
                type="text"
                placeholder="Password"
                className="w-full h-14 rounded-xl bg-[#f0f2f5] px-4 text-base text-[#111418] placeholder:text-[#60758a] focus:outline-none"
            />
            </div>

            {/* Confrim Password */}
            <div>
            <p className="font-semibold, text-[#48494a]">Confrim Password</p>
            <input
                type="text"
                placeholder="Confrim Password"
                className="w-full h-14 rounded-xl bg-[#f0f2f5] px-4 text-base text-[#111418] placeholder:text-[#60758a] focus:outline-none"
            />
            </div>
        </div>
    </div>
    );
    
}