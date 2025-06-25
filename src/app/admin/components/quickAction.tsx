import Link from 'next/link'

export default function QuickAction({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ElementType
  label: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 border rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  )
}