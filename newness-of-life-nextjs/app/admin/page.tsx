import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, FolderOpen, Image, TrendingUp } from "lucide-react"
import Link from "next/link"

const stats = [
  {
    title: "Events",
    value: "12",
    description: "Aktive Veranstaltungen",
    icon: Calendar,
    href: "/admin/events",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    title: "Kategorien",
    value: "5",
    description: "Event-Kategorien",
    icon: FolderOpen,
    href: "/admin/categories",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    title: "Medien",
    value: "48",
    description: "Hochgeladene Dateien",
    icon: Image,
    href: "/admin/media",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    title: "Besucher",
    value: "1.2k",
    description: "Diese Woche",
    icon: TrendingUp,
    href: "/admin",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
]

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-2">
          Willkommen im Admin-Bereich der Newness of Life Website.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Schnellaktionen</CardTitle>
            <CardDescription>Häufig verwendete Funktionen</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link
              href="/admin/events/new"
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <Calendar className="h-5 w-5 text-[var(--color-primary)]" />
              <div>
                <p className="font-medium">Neues Event erstellen</p>
                <p className="text-sm text-gray-500">
                  Füge eine neue Veranstaltung hinzu
                </p>
              </div>
            </Link>
            <Link
              href="/admin/categories"
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <FolderOpen className="h-5 w-5 text-[var(--color-secondary)]" />
              <div>
                <p className="font-medium">Kategorien verwalten</p>
                <p className="text-sm text-gray-500">
                  Bearbeite Event-Kategorien
                </p>
              </div>
            </Link>
            <Link
              href="/admin/media"
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <Image className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium">Medien hochladen</p>
                <p className="text-sm text-gray-500">
                  Bilder und PDFs verwalten
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Letzte Aktivitäten</CardTitle>
            <CardDescription>Kürzlich bearbeitete Inhalte</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Christmas Celebration Dinner</p>
                  <p className="text-xs text-gray-500">Event erstellt</p>
                </div>
                <span className="text-xs text-gray-400">vor 2 Stunden</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">From Glory to Glory 2026</p>
                  <p className="text-xs text-gray-500">Event bearbeitet</p>
                </div>
                <span className="text-xs text-gray-400">vor 5 Stunden</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">event-flyer.pdf</p>
                  <p className="text-xs text-gray-500">Datei hochgeladen</p>
                </div>
                <span className="text-xs text-gray-400">gestern</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
