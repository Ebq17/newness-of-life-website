"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
} from "lucide-react"
import { formatDate } from "@/lib/utils"

// Mock data - will be replaced with Supabase data
const mockEvents = [
  {
    id: "1",
    title: "Church Family Breakfast",
    slug: "church-family-breakfast",
    start_date: "2025-11-08T09:00:00",
    location: "in der Gemeinde",
    category: { name: "Gemeinschaft", color: "#EC4899" },
    is_published: true,
    is_featured: false,
  },
  {
    id: "2",
    title: "Worship Night – Youth & Young Adults",
    slug: "worship-night-youth",
    start_date: "2025-11-23T19:00:00",
    location: "in der Gemeinde",
    category: { name: "Jugend", color: "#8B5CF6" },
    is_published: true,
    is_featured: true,
  },
  {
    id: "3",
    title: "Christmas Celebration Dinner",
    slug: "christmas-celebration",
    start_date: "2025-12-20T17:00:00",
    location: "in der Gemeinde",
    category: { name: "Special Event", color: "#F59E0B" },
    is_published: true,
    is_featured: true,
  },
  {
    id: "4",
    title: "From Glory to Glory 2026",
    slug: "glory-to-glory-2026",
    start_date: "2025-12-31T20:00:00",
    location: "in der Gemeinde",
    category: { name: "Special Event", color: "#F59E0B" },
    is_published: true,
    is_featured: true,
  },
]

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredEvents = mockEvents.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 mt-1">
            Verwalte alle Veranstaltungen der Gemeinde.
          </p>
        </div>
        <Link href="/admin/events/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Neues Event
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Events durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Event</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-gray-500"
                  >
                    Keine Events gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-gray-500">
                            {event.location}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{ backgroundColor: event.category.color }}
                        className="text-white"
                      >
                        {event.category.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(event.start_date, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {event.is_published ? (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-200 bg-green-50"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Veröffentlicht
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-gray-600 border-gray-200"
                          >
                            <EyeOff className="h-3 w-3 mr-1" />
                            Entwurf
                          </Badge>
                        )}
                        {event.is_featured && (
                          <Badge
                            variant="outline"
                            className="text-yellow-600 border-yellow-200 bg-yellow-50"
                          >
                            Featured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/events/${event.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/veranstaltungen/${event.slug}`}
                              target="_blank"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Vorschau
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
