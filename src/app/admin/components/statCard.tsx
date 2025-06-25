export default function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-200 border-gray-700 rounded-lg p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}