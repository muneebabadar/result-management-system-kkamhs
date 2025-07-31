'use client'

import { useRouter } from 'next/navigation'

type Props = {
  className: string
}

export default function ClassCard({ className }: Props) {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push(`../admin/promotions/${encodeURIComponent(className)}`)}
      className="cursor-pointer rounded-lg border bg-white p-6 shadow hover:shadow-md transition"
    >
      <h2 className="text-lg font-semibold text-gray-800">{className}</h2>
      <p className="text-sm text-gray-500">View students eligible for promotion</p>
    </div>
  )
}
