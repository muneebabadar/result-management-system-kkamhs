// app/layout.tsx or app/components/header.tsx
import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f1e9ea] px-10 py-3">
        {/* Title */}
        <div className="flex items-center gap-2 text-[#191011]">
            <h2 className="text-[#191011] text-lg font-bold leading-tight tracking-[-0.015em]">
                Khadija Kazi Ali Memorial High School
            </h2>
        </div>


        {/* Navigation */}
        <div className="flex flex-1 justify-end gap-8">
            <nav className="flex items-center gap-9">
            <Link className="text-[#191011] text-sm font-medium leading-normal" href="/">
                Home
            </Link>
            <Link className="text-[#191011] text-sm font-medium leading-normal" href="#">
                About
            </Link>
            <Link className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl h-10 px-4 bg-[#a9a9a9] text-[#191011] text-sm font-bold leading-normal tracking-[0.015em]" href="#">
                SignUp
            </Link>
            </nav>
        </div>
    </header>
  );
}
