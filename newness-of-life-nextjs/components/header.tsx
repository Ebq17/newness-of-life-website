"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/", label: "Startseite" },
  { href: "/gottesdienste", label: "Gottesdienste" },
  { href: "/veranstaltungen", label: "Veranstaltungen" },
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/spenden", label: "Spenden" },
]

export function Header() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Don't show header on admin pages
  if (pathname.startsWith("/admin")) {
    return null
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-dark)]/90 backdrop-blur-sm">
      <div className="container">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-[var(--color-primary)] font-bold text-lg">NL</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-white font-bold text-lg block leading-tight">
                Newness of Life
              </span>
              <span className="text-white/70 text-xs">
                International Church
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-white/80 hover:text-white transition-colors font-medium",
                  pathname === item.href && "text-white"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:block">
            <Button asChild variant="secondary">
              <Link href="/spenden">Spenden</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden py-4 border-t border-white/10">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "text-white/80 hover:text-white transition-colors font-medium py-2",
                    pathname === item.href && "text-white"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 mt-2 border-t border-white/10">
                <Button asChild variant="secondary" className="w-full">
                  <Link href="/spenden">Spenden</Link>
                </Button>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
