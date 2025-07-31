'use client'

import ClassCard from "../components/classCard"

const classList = [
  'Grade 5A', 'Grade 5B', 'Grade 5C',
  'Grade 6A', 'Grade 6B', 'Grade 6C',
  'Grade 7A', 'Grade 7B', 'Grade 7C',
]

export default function PromotionsLandingPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Select Class for Promotions</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {classList.map((className) => (
          <ClassCard key={className} className={className} />
        ))}
      </div>
    </div>
  )
}
