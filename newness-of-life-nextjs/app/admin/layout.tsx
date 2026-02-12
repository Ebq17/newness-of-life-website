"use client"

import { usePathname } from "next/navigation"
import { AdminSidebar } from "@/components/admin/sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Check if we're on an event edit page (full-screen preview editor)
  const isEventEditPage =
    pathname.match(/^\/admin\/events\/[^/]+$/) && pathname !== "/admin/events/new"

  // Full-screen mode for event editor
  if (isEventEditPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="lg:ml-[250px] min-h-screen">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
