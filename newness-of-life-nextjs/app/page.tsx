import Link from "next/link"
import { Calendar, MapPin, Clock, ArrowRight, Church, Users, Heart, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDate, formatTime } from "@/lib/utils"

// Mock data - will be replaced with Supabase data
const upcomingEvents = [
  {
    id: "1",
    title: "Church Family Breakfast",
    slug: "church-family-breakfast",
    start_date: "2025-11-08T09:00:00",
    location: "in der Gemeinde",
    category: { name: "Gemeinschaft", color: "#EC4899" },
  },
  {
    id: "2",
    title: "Worship Night – Youth",
    slug: "worship-night-youth",
    start_date: "2025-11-23T19:00:00",
    location: "in der Gemeinde",
    category: { name: "Jugend", color: "#8B5CF6" },
  },
  {
    id: "3",
    title: "Christmas Celebration",
    slug: "christmas-celebration",
    start_date: "2025-12-20T17:00:00",
    location: "in der Gemeinde",
    category: { name: "Special Event", color: "#F59E0B" },
  },
]

const services = [
  {
    icon: Church,
    title: "Gottesdienst",
    time: "Sonntags 10:30 Uhr",
    description: "Erlebe inspirierende Predigten und gemeinsame Anbetung.",
  },
  {
    icon: BookOpen,
    title: "Bibelstunde",
    time: "Mittwochs 19:00 Uhr",
    description: "Tauche tiefer ein in Gottes Wort.",
  },
  {
    icon: Users,
    title: "Jugendabend",
    time: "Freitags 19:00 Uhr",
    description: "Gemeinschaft und Spaß für junge Leute.",
  },
  {
    icon: Heart,
    title: "Gebet",
    time: "Samstags 07:00 Uhr",
    description: "Gemeinsam vor Gott treten im Gebet.",
  },
]

export default function Home() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center bg-gradient-to-br from-[#5fa4dd] to-[#eef2f3]">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
        <div className="container relative z-10 py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 drop-shadow-lg">
              Newness of Life
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
              Eine lebendige Gemeinde, die Jesus nachfolgt und Menschen in der Liebe Gottes willkommen heißt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8">
                <Link href="/gottesdienste">Gottesdienste entdecken</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 bg-white/10 border-white/40 text-white hover:bg-white/20">
                <Link href="/ueber-uns">Mehr erfahren</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Unsere Gottesdienste</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Besuche uns und werde Teil unserer Gemeinschaft. Wir freuen uns auf dich!
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <div
                key={service.title}
                className="group p-6 bg-[var(--color-light)] rounded-2xl hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary)] transition-colors">
                  <service.icon className="h-7 w-7 text-[var(--color-primary)] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-1">{service.title}</h3>
                <p className="text-[var(--color-secondary)] font-semibold text-sm mb-2">
                  {service.time}
                </p>
                <p className="text-gray-600 text-sm">{service.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button asChild variant="outline" size="lg">
              <Link href="/gottesdienste">
                Alle Gottesdienste anzeigen
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-20 bg-[var(--color-light)]">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Kommende Veranstaltungen</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Entdecke alle Events und werde Teil unserer Gemeinschaft.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/veranstaltungen/${event.slug}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all"
              >
                <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
                  <Calendar className="h-12 w-12 text-gray-400" />
                  <span
                    className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: event.category.color }}
                  >
                    {event.category.name}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-3 group-hover:text-[var(--color-primary)] transition-colors">
                    {event.title}
                  </h3>
                  <div className="flex flex-col gap-2 text-sm text-gray-500">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(event.start_date, { day: "numeric", month: "long" })}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {formatTime(event.start_date)} Uhr
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button asChild size="lg">
              <Link href="/veranstaltungen">
                Alle Veranstaltungen
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]">
        <div className="container text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Werde Teil unserer Gemeinschaft</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Wir freuen uns darauf, dich kennenzulernen. Besuche uns bei einem unserer Gottesdienste.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="text-lg px-8">
              <Link href="/gottesdienste">Gottesdienste</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white/10">
              <Link href="/ueber-uns">Über uns</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
