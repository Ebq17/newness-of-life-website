"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar, Clock, MapPin, Image, FileText, Link as LinkIcon, Save, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { generateSlug } from "@/lib/utils"

// Mock categories - will be replaced with Supabase data
const categories = [
  { id: "1", slug: "gottesdienst", name: "Gottesdienst", color: "#2563EB" },
  { id: "2", slug: "gebet", name: "Gebet", color: "#10B981" },
  { id: "3", slug: "jugend", name: "Jugend", color: "#8B5CF6" },
  { id: "4", slug: "special", name: "Special Event", color: "#F59E0B" },
  { id: "5", slug: "gemeinschaft", name: "Gemeinschaft", color: "#EC4899" },
]

interface EventFormProps {
  mode: "create" | "edit"
  initialData?: {
    id?: string
    title: string
    slug: string
    description: string
    start_date: string
    end_date: string
    all_day: boolean
    location: string
    category_id: string
    main_image_url: string
    flyer_pdf_url: string
    is_recurring: boolean
    recurrence_rule: {
      frequency: string
      day_of_week: number
      time: string
      end_date: string
    } | null
    is_featured: boolean
    is_published: boolean
    external_link: string
  }
}

export function EventForm({ mode, initialData }: EventFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    start_date: initialData?.start_date?.split("T")[0] || "",
    start_time: initialData?.start_date?.split("T")[1]?.slice(0, 5) || "",
    end_date: initialData?.end_date?.split("T")[0] || "",
    end_time: initialData?.end_date?.split("T")[1]?.slice(0, 5) || "",
    all_day: initialData?.all_day || false,
    location: initialData?.location || "",
    category_id: initialData?.category_id || "",
    main_image_url: initialData?.main_image_url || "",
    flyer_pdf_url: initialData?.flyer_pdf_url || "",
    is_recurring: initialData?.is_recurring || false,
    recurrence_frequency: initialData?.recurrence_rule?.frequency || "weekly",
    recurrence_day: initialData?.recurrence_rule?.day_of_week?.toString() || "0",
    recurrence_time: initialData?.recurrence_rule?.time || "",
    recurrence_end_date: initialData?.recurrence_rule?.end_date || "",
    is_featured: initialData?.is_featured || false,
    is_published: initialData?.is_published ?? true,
    external_link: initialData?.external_link || "",
  })

  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      title: value,
      slug: mode === "create" ? generateSlug(value) : prev.slug,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // TODO: Save to Supabase
      console.log("Form data:", formData)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      router.push("/admin/events")
    } catch (error) {
      console.error("Error saving event:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/events">
            <Button type="button" variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {mode === "create" ? "Neues Event erstellen" : "Event bearbeiten"}
            </h1>
            <p className="text-gray-500 text-sm">
              {mode === "create"
                ? "Füge eine neue Veranstaltung hinzu"
                : "Bearbeite die Details dieser Veranstaltung"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Speichern..." : "Speichern"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Grundinformationen</CardTitle>
              <CardDescription>
                Titel, Beschreibung und Kategorie des Events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="z.B. Gottesdienst, Jugendabend..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL-Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="event-url-slug"
                />
                <p className="text-xs text-gray-500">
                  /veranstaltungen/{formData.slug || "..."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Beschreibe das Event..."
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategorie</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Date & Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Datum & Uhrzeit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="all_day">Ganztägiges Event</Label>
                <Switch
                  id="all_day"
                  checked={formData.all_day}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, all_day: checked }))
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Startdatum *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        start_date: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                {!formData.all_day && (
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Startzeit</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          start_time: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="end_date">Enddatum</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        end_date: e.target.value,
                      }))
                    }
                  />
                </div>
                {!formData.all_day && (
                  <div className="space-y-2">
                    <Label htmlFor="end_time">Endzeit</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          end_time: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Ort
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="location">Veranstaltungsort</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder="z.B. in der Gemeinde, Online..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Recurring */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Wiederkehrend
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_recurring">Wiederkehrendes Event</Label>
                <Switch
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_recurring: checked }))
                  }
                />
              </div>

              {formData.is_recurring && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_frequency">Häufigkeit</Label>
                    <Select
                      value={formData.recurrence_frequency}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          recurrence_frequency: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Wöchentlich</SelectItem>
                        <SelectItem value="monthly">Monatlich</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.recurrence_frequency === "weekly" && (
                    <div className="space-y-2">
                      <Label htmlFor="recurrence_day">Wochentag</Label>
                      <Select
                        value={formData.recurrence_day}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            recurrence_day: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Sonntag</SelectItem>
                          <SelectItem value="1">Montag</SelectItem>
                          <SelectItem value="2">Dienstag</SelectItem>
                          <SelectItem value="3">Mittwoch</SelectItem>
                          <SelectItem value="4">Donnerstag</SelectItem>
                          <SelectItem value="5">Freitag</SelectItem>
                          <SelectItem value="6">Samstag</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="recurrence_time">Uhrzeit</Label>
                    <Input
                      id="recurrence_time"
                      type="time"
                      value={formData.recurrence_time}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          recurrence_time: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recurrence_end_date">Ende am</Label>
                    <Input
                      id="recurrence_end_date"
                      type="date"
                      value={formData.recurrence_end_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          recurrence_end_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Veröffentlichung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_published">Veröffentlicht</Label>
                  <p className="text-xs text-gray-500">
                    Event ist öffentlich sichtbar
                  </p>
                </div>
                <Switch
                  id="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_published: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_featured">Featured</Label>
                  <p className="text-xs text-gray-500">
                    Auf der Startseite hervorheben
                  </p>
                </div>
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_featured: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Main Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Hauptbild
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                <Image className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-500 mb-2">
                  Bild hierher ziehen oder
                </p>
                <Button type="button" variant="outline" size="sm">
                  Durchsuchen
                </Button>
              </div>
              <div className="mt-3">
                <Label htmlFor="main_image_url">Oder URL eingeben</Label>
                <Input
                  id="main_image_url"
                  value={formData.main_image_url}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      main_image_url: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Flyer PDF */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Flyer (PDF)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                <FileText className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-500 mb-2">
                  PDF hier ablegen oder
                </p>
                <Button type="button" variant="outline" size="sm">
                  Durchsuchen
                </Button>
              </div>
              <div className="mt-3">
                <Label htmlFor="flyer_pdf_url">Oder URL eingeben</Label>
                <Input
                  id="flyer_pdf_url"
                  value={formData.flyer_pdf_url}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      flyer_pdf_url: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* External Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Externer Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="external_link">URL</Label>
                <Input
                  id="external_link"
                  value={formData.external_link}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      external_link: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
                <p className="text-xs text-gray-500">
                  Verlinkung zu einer externen Seite
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
