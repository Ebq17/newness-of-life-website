import { Metadata } from "next"
import Link from "next/link"
import { Calendar, MapPin, Clock, ArrowLeft, Share2, Download, ExternalLink } from "lucide-react"
import { formatDate, formatTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Mock data - will be replaced with Supabase data (including drafts for preview)
const mockEvents: Record<string, {
  id: string
  title: string
  slug: string
  description: string
  start_date: string
  end_date: string | null
  location: string
  category: { name: string; color: string }
  main_image_url: string | null
  flyer_pdf_url: string | null
  external_link: string | null
  is_published: boolean
}> = {
  "church-family-breakfast": {
    id: "1",
    title: "Church Family Breakfast",
    slug: "church-family-breakfast",
    description: "Gemeinsames Frühstück vor dem Gottesdienst für die ganze Familie. Komm vorbei und genieße die Gemeinschaft mit Kaffee, frischen Brötchen und guten Gesprächen.\n\nWir beginnen um 9:00 Uhr und enden rechtzeitig vor dem Gottesdienst um 10:30 Uhr.",
    start_date: "2025-11-08T09:00:00",
    end_date: "2025-11-08T10:30:00",
    location: "in der Gemeinde",
    category: { name: "Gemeinschaft", color: "#EC4899" },
    main_image_url: null,
    flyer_pdf_url: null,
    external_link: null,
    is_published: true,
  },
  "worship-night-youth": {
    id: "2",
    title: "Worship Night – Youth & Young Adults",
    slug: "worship-night-youth",
    description: "Ein Abend voller Worship und Gemeinschaft für junge Leute. Erlebe eine kraftvolle Zeit der Anbetung mit Live-Musik und inspirierenden Momenten.\n\nAlle jungen Erwachsenen zwischen 16 und 30 Jahren sind herzlich eingeladen.",
    start_date: "2025-11-23T19:00:00",
    end_date: "2025-11-23T22:00:00",
    location: "in der Gemeinde",
    category: { name: "Jugend", color: "#8B5CF6" },
    main_image_url: null,
    flyer_pdf_url: null,
    external_link: null,
    is_published: true,
  },
  "christmas-celebration": {
    id: "3",
    title: "Christmas Celebration Dinner",
    slug: "christmas-celebration",
    description: "Feiere Weihnachten mit uns bei einem festlichen Abendessen. Genieße ein köstliches Menü in einer wunderschön dekorierten Atmosphäre.\n\nBitte melde dich bis zum 15. Dezember an, damit wir entsprechend planen können.",
    start_date: "2025-12-20T17:00:00",
    end_date: "2025-12-20T21:00:00",
    location: "in der Gemeinde",
    category: { name: "Special Event", color: "#F59E0B" },
    main_image_url: null,
    flyer_pdf_url: null,
    external_link: null,
    is_published: true,
  },
  "glory-to-glory-2026": {
    id: "4",
    title: "From Glory to Glory 2026",
    slug: "glory-to-glory-2026",
    description: "Silvester-Gottesdienst: Zusammen ins neue Jahr starten. Erlebe einen besonderen Abend mit Worship, Wort und Gebet während wir gemeinsam das neue Jahr begrüßen.\n\nDer Abend endet mit einem gemeinsamen Countdown um Mitternacht.",
    start_date: "2025-12-31T20:00:00",
    end_date: "2026-01-01T00:30:00",
    location: "in der Gemeinde",
    category: { name: "Special Event", color: "#F59E0B" },
    main_image_url: null,
    flyer_pdf_url: null,
    external_link: null,
    is_published: true,
  },
}

interface PreviewPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}

export default async function EventPreviewPage({ params, searchParams }: PreviewPageProps) {
  const { slug } = await params
  const { preview } = await searchParams
  const isPreviewMode = preview === "true"
  const event = mockEvents[slug]

  if (!event) {
    return (
      <div className="min-h-screen bg-[var(--color-light)] py-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Event nicht gefunden</h1>
          <p className="text-gray-600">Dieses Event existiert nicht.</p>
        </div>
      </div>
    )
  }

  // Script for click-to-edit functionality
  const clickToEditScript = isPreviewMode
    ? `
    <script>
      document.addEventListener('click', function(e) {
        const field = e.target.closest('[data-cms-field]');
        if (field) {
          e.preventDefault();
          window.parent.postMessage({
            type: 'CLICK_TO_EDIT',
            fieldId: field.dataset.cmsField
          }, '*');
        }
      });
    </script>
  `
    : ""

  return (
    <>
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 text-center py-2 text-sm font-medium">
          Vorschau-Modus – Klicke auf Bereiche, um sie zu bearbeiten
        </div>
      )}

      <main className={`min-h-screen bg-[var(--color-light)] ${isPreviewMode ? "pt-10" : ""}`}>
        {/* Hero */}
        <section className="relative py-16 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)]">
          <div className="absolute inset-0 bg-black/30" />
          <div className="container relative z-10">
            <Link
              href="/veranstaltungen"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zu Events
            </Link>
            <span
              className="inline-block px-4 py-1 rounded-full text-sm font-semibold text-white mb-4"
              style={{ backgroundColor: event.category.color }}
              data-cms-field="category"
            >
              {event.category.name}
            </span>
            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              data-cms-field="title"
            >
              {event.title}
            </h1>
            <div className="flex flex-wrap gap-6 text-white/90">
              <span className="flex items-center gap-2" data-cms-field="start_date">
                <Calendar className="h-5 w-5" />
                {formatDate(event.start_date)}
              </span>
              <span className="flex items-center gap-2" data-cms-field="time">
                <Clock className="h-5 w-5" />
                {formatTime(event.start_date)} Uhr
                {event.end_date && ` – ${formatTime(event.end_date)} Uhr`}
              </span>
              <span className="flex items-center gap-2" data-cms-field="location">
                <MapPin className="h-5 w-5" />
                {event.location}
              </span>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Main Content */}
              <div className="lg:col-span-2">
                {/* Image */}
                <div
                  className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mb-8 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all"
                  data-cms-field="main_image"
                >
                  <Calendar className="h-24 w-24 text-gray-400" />
                  {isPreviewMode && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity rounded-2xl">
                      <span className="bg-white px-4 py-2 rounded-lg font-medium">
                        Bild ändern
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="bg-white rounded-2xl p-8 shadow-sm">
                  <h2 className="text-2xl font-bold mb-4">Über dieses Event</h2>
                  <div
                    className="prose prose-gray max-w-none"
                    data-cms-field="description"
                  >
                    {event.description.split("\n").map((paragraph, idx) => (
                      <p key={idx} className="mb-4 text-gray-600">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Details Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold mb-4">Details</h3>
                  <div className="space-y-4">
                    <div data-cms-field="start_date">
                      <p className="text-sm text-gray-500 mb-1">Datum</p>
                      <p className="font-medium">{formatDate(event.start_date)}</p>
                    </div>
                    <div data-cms-field="time">
                      <p className="text-sm text-gray-500 mb-1">Uhrzeit</p>
                      <p className="font-medium">
                        {formatTime(event.start_date)} Uhr
                        {event.end_date && ` – ${formatTime(event.end_date)} Uhr`}
                      </p>
                    </div>
                    <div data-cms-field="location">
                      <p className="text-sm text-gray-500 mb-1">Ort</p>
                      <p className="font-medium">{event.location}</p>
                    </div>
                    <div data-cms-field="category">
                      <p className="text-sm text-gray-500 mb-1">Kategorie</p>
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: event.category.color }}
                      >
                        {event.category.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
                  <Button className="w-full" variant="default">
                    <Calendar className="h-4 w-4 mr-2" />
                    Zum Kalender hinzufügen
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Teilen
                  </Button>
                  {event.flyer_pdf_url && (
                    <Button className="w-full" variant="outline" asChild>
                      <a href={event.flyer_pdf_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Flyer herunterladen
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Inject click-to-edit script in preview mode */}
      {isPreviewMode && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('click', function(e) {
                const field = e.target.closest('[data-cms-field]');
                if (field) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.parent.postMessage({
                    type: 'CLICK_TO_EDIT',
                    fieldId: field.dataset.cmsField
                  }, '*');
                }
              });
            `,
          }}
        />
      )}
    </>
  )
}
