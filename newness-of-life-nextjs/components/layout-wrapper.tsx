"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Check if we're on an admin page
  const isAdminPage = pathname.startsWith("/admin")

  // Check if we're on a preview page (no header/footer needed)
  const isPreviewPage = pathname.includes("/preview")

  // Don't show header/footer on admin or preview pages
  if (isAdminPage || isPreviewPage) {
    return <>{children}</>
  }

  return (
    <>
      <Header />
      <div className="pt-20">{children}</div>
      <Footer />
    </>
  )
}
