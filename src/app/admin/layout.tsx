import AdminSidebar from './components/adminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <AdminSidebar />
      <main className="ml-64 p-6 w-full">{children}</main>
    </div>
  )
}
