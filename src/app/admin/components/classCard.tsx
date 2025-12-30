'use client'

import { useRouter } from 'next/navigation'

type Props = {
  classSectionId: number
  label: string
}

export default function ClassCard({ classSectionId, label }: Props) {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push(`/admin/promotions/${classSectionId}`)}
      className="cursor-pointer rounded-lg border bg-white p-6 shadow hover:shadow-md transition"
    >
      <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
      <p className="text-sm text-gray-500">View students eligible for promotion</p>
    </div>
  )
}
