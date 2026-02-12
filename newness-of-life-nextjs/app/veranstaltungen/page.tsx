import { Metadata } from "next"
import Link from "next/link"
import { Calendar, MapPin, Clock, ArrowRight } from "lucide-react"
import { formatDate, formatTime } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Veranstaltungen | Newness of Life",
  description: "Entdecke alle kommenden Veranstaltungen unserer Gemeinde.",
}

// Mock data - will be replaced with Supabase data
const mockEvents = [
  {
    id: "1",
    title: "Church Family Breakfast",
    slug: "church-family-breakfast",
    description: "Gemeinsames Frühstück vor dem Gottesdienst für die ganze Familie.",
    start_date: "2025-11-08T09:00:00",
    location: "in der Gemeinde",
    category: { name: "Gemeinschaft", color: "#EC4899", slug: "gemeinschaft" },
    is_featured: false,
    main_image_url: null,
  },
  {
    id: "2",
    title: "Worship Night – Youth & Young Adults",
    slug: "worship-night-youth",
    description: "Ein Abend voller Worship und Gemeinschaft für junge Leute.",
    start_date: "2025-11-23T19:00:00",
    location: "in der Gemeinde",
    category: { name: "Jugend", color: "#8B5CF6", slug: "jugend" },
    is_featured: true,
    main_image_url: null,
  },
  {
    id: "3",
    title: "Christmas Celebration Dinner",
    slug: "christmas-celebration",
    description: "Feiere Weihnachten mit uns bei einem festlichen Abendessen.",
    start_date: "2025-12-20T17:00:00",
    location: "in der Gemeinde",
    category: { name: "Special Event", color: "#F59E0B", slug: "special" },
    is_featured: true,
    main_image_url: null,
  },
  {
    id: "4",
    title: "From Glory to Glory 2026",
    slug: "glory-to-glory-2026",
    description: "Silvester-Gottesdienst: Zusammen ins neue Jahr starten.",
    start_date: "2025-12-31T20:00:00",
    location: "in der Gemeinde",
    category: { name: "Special Event", color: "#F59E0B", slug: "special" },
    is_featured: true,
    main_image_url: null,
  },
]

const categories = [
  { slug: "alle", name: "Alle", color: "#6B7280" },
  { slug: "gottesdienst", name: "Gottesdienst", color: "#2563EB" },
  { slug: "gebet", name: "Gebet", color: "#10B981" },
  { slug: "jugend", name: "Jugend", color: "#8B5CF6" },
  { slug: "special", name: "Special Event", color: "#F59E0B" },
  { slug: "gemeinschaft", name: "Gemeinschaft", color: "#EC4899" },
]

export default function EventsPage() {
  return (
    <main className="min-h-screen bg-[var(--color-light)]">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)]">
        <div className="absolute inset-0 bg-black/30" />
        <div className="container relative z-10 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Veranstaltungen
          </h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Entdecke alle kommenden Events und werde Teil unserer Gemeinschaft.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-6 bg-white border-b">
        <div className="container">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors hover:bg-gray-100"
                style={{
                  backgroundColor: cat.slug === "alle" ? cat.color : undefined,
                  color: cat.slug === "alle" ? "white" : cat.color,
                  border: cat.slug !== "alle" ? `2px solid ${cat.color}` : undefined,
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-12 bg-white">
        <div className="container">
          <h2 className="text-2xl font-bold mb-6">Featured Events</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {mockEvents
              .filter((e) => e.is_featured)
              .map((event) => (
                <Link
                  key={event.id}
                  href={`/veranstaltungen/${event.slug}`}
                  className="group flex flex-col md:flex-row gap-4 bg-[var(--color-light)] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="md:w-48 h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-16 w-16 text-gray-400" />
                  </div>
                  <div className="p-6 flex flex-col justify-center">
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white mb-2 w-fit"
                      style={{ backgroundColor: event.category.color }}
                    >
                      {event.category.name}
                    </span>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-[var(--color-primary)] transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {event.description}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(event.start_date, {
                          day: "numeric",
                          month: "long",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatTime(event.start_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* All Events */}
      <section className="py-12">
        <div className="container">
          <h2 className="text-2xl font-bold mb-6">Alle Veranstaltungen</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockEvents.map((event) => (
              <Link
                key={event.id}
                href={`/veranstaltungen/${event.slug}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
                  <Calendar className="h-16 w-16 text-gray-400" />
                  <span
                    className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: event.category.color }}
                  >
                    {event.category.name}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-2 group-hover:text-[var(--color-primary)] transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(event.start_date, {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTime(event.start_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-primary)] font-medium">
                    <span>Mehr erfahren</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
