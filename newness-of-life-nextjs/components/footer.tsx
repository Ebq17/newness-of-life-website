"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MapPin, Phone, Mail, Facebook, Instagram, Youtube } from "lucide-react"

const quickLinks = [
  { href: "/gottesdienste", label: "Gottesdienste" },
  { href: "/veranstaltungen", label: "Veranstaltungen" },
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/spenden", label: "Spenden" },
]

const legalLinks = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
]

export function Footer() {
  const pathname = usePathname()

  // Don't show footer on admin pages
  if (pathname.startsWith("/admin")) {
    return null
  }

  return (
    <footer className="bg-[var(--color-dark)] text-white/80">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* About */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-[var(--color-primary)] font-bold text-lg">NL</span>
              </div>
              <div>
                <span className="text-white font-bold text-lg block leading-tight">
                  Newness of Life
                </span>
                <span className="text-white/60 text-xs">
                  International Church
                </span>
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              Eine lebendige Gemeinde, die Jesus nachfolgt und Menschen in der Liebe Gottes willkommen heißt.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6">Schnelllinks</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-6">Kontakt</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                <span className="text-white/70">
                  Musterstraße 123<br />
                  12345 Musterstadt
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-[var(--color-primary)]" />
                <a href="tel:+491234567890" className="text-white/70 hover:text-white">
                  +49 123 456 7890
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-[var(--color-primary)]" />
                <a href="mailto:info@nol-church.de" className="text-white/70 hover:text-white">
                  info@nol-church.de
                </a>
              </li>
            </ul>
          </div>

          {/* Social & Donate */}
          <div>
            <h4 className="text-white font-bold mb-6">Folge uns</h4>
            <div className="flex gap-4 mb-6">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[var(--color-primary)] transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[var(--color-primary)] transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[var(--color-primary)] transition-colors"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
            <div>
              <p className="text-white/70 text-sm mb-3">
                Unterstütze unsere Arbeit
              </p>
              <Link
                href="/spenden"
                className="inline-block px-6 py-2 bg-[var(--color-primary)] text-white rounded-full font-semibold hover:bg-[var(--color-secondary)] transition-colors"
              >
                Jetzt spenden
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/50 text-sm">
              © {new Date().getFullYear()} Newness of Life International Church. Alle Rechte vorbehalten.
            </p>
            <div className="flex gap-6">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/50 hover:text-white text-sm transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
