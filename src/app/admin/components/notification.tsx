import { Bell } from "lucide-react"

export default function Notification({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 bg-gray-100 rounded-lg p-4">
      <Bell className="h-5 w-5 text-gray-600 mt-1" />
      <div>
        <p className="font-medium text-gray-800">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )
}