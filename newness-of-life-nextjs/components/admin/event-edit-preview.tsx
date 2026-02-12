"use client"

import { useState, useCallback, useEffect } from "react"
import { PreviewLayout } from "./preview-layout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Calendar, Clock, MapPin, Image, FileText, Link as LinkIcon, Settings } from "lucide-react"
import { generateSlug } from "@/lib/utils"

// Mock categories
const categories = [
  { id: "1", slug: "gottesdienst", name: "Gottesdienst", color: "#2563EB" },
  { id: "2", slug: "gebet", name: "Gebet", color: "#10B981" },
  { id: "3", slug: "jugend", name: "Jugend", color: "#8B5CF6" },
  { id: "4", slug: "special", name: "Special Event", color: "#F59E0B" },
  { id: "5", slug: "gemeinschaft", name: "Gemeinschaft", color: "#EC4899" },
]

interface EventEditWithPreviewProps {
  initialData: {
    id: string
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
    recurrence_rule: null
    is_featured: boolean
    is_published: boolean
    external_link: string
  }
}

export function EventEditWithPreview({ initialData }: EventEditWithPreviewProps) {
  const [formData, setFormData] = useState({
    title: initialData.title,
    slug: initialData.slug,
    description: initialData.description,
    start_date: initialData.start_date?.split("T")[0] || "",
    start_time: initialData.start_date?.split("T")[1]?.slice(0, 5) || "",
    end_date: initialData.end_date?.split("T")[0] || "",
    end_time: initialData.end_date?.split("T")[1]?.slice(0, 5) || "",
    all_day: initialData.all_day,
    location: initialData.location,
    category_id: initialData.category_id,
    main_image_url: initialData.main_image_url,
    flyer_pdf_url: initialData.flyer_pdf_url,
    is_recurring: initialData.is_recurring,
    is_featured: initialData.is_featured,
    is_published: initialData.is_published,
    external_link: initialData.external_link,
  })

  const [isDraft, setIsDraft] = useState(!initialData.is_published)
  const [activeField, setActiveField] = useState<string | null>(null)

  // Listen for click-to-edit messages from preview iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "CLICK_TO_EDIT") {
        setActiveField(event.data.fieldId)
        // Scroll to and highlight the field
        const element = document.querySelector(`[data-field-id="${event.data.fieldId}"]`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
          element.classList.add("ring-2", "ring-[var(--color-primary)]", "ring-offset-2")
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-[var(--color-primary)]", "ring-offset-2")
          }, 2000)
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      title: value,
      slug: generateSlug(value),
    }))
  }

  const handleSave = useCallback(async () => {
    // TODO: Save to Supabase as draft
    console.log("Saving draft:", formData)
    await new Promise((resolve) => setTimeout(resolve, 500))
  }, [formData])

  const handlePublish = useCallback(async () => {
    // TODO: Publish to Supabase
    console.log("Publishing:", formData)
    setIsDraft(false)
    setFormData((prev) => ({ ...prev, is_published: true }))
    await new Promise((resolve) => setTimeout(resolve, 500))
  }, [formData])

  // Build preview URL with current slug
  const previewUrl = `/veranstaltungen/${formData.slug}/preview?preview=true`

  return (
    <PreviewLayout
      previewUrl={previewUrl}
      title={formData.title || "Neues Event"}
      backUrl="/admin/events"
      onSave={handleSave}
      onPublish={handlePublish}
      isDraft={isDraft}
    >
      <div className="space-y-6">
        <Accordion type="multiple" defaultValue={["basic", "datetime", "location"]} className="space-y-4">
          {/* Basic Info */}
          <AccordionItem value="basic" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-500" />
                <span className="font-semibold">Grundinformationen</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              <div className="space-y-2" data-field-id="title">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Event-Titel eingeben..."
                  className={activeField === "title" ? "ring-2 ring-[var(--color-primary)]" : ""}
                />
              </div>

              <div className="space-y-2" data-field-id="description">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Beschreibe das Event..."
                  rows={4}
                  className={activeField === "description" ? "ring-2 ring-[var(--color-primary)]" : ""}
                />
              </div>

              <div className="space-y-2" data-field-id="category">
                <Label>Kategorie</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category_id: value }))
                  }
                >
                  <SelectTrigger className={activeField === "category" ? "ring-2 ring-[var(--color-primary)]" : ""}>
                    <SelectValue placeholder="Kategorie wählen" />
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
            </AccordionContent>
          </AccordionItem>

          {/* Date & Time */}
          <AccordionItem value="datetime" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-semibold">Datum & Uhrzeit</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="all_day">Ganztägig</Label>
                <Switch
                  id="all_day"
                  checked={formData.all_day}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, all_day: checked }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3" data-field-id="start_date">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Startdatum</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, start_date: e.target.value }))
                    }
                  />
                </div>
                {!formData.all_day && (
                  <div className="space-y-2" data-field-id="time">
                    <Label htmlFor="start_time">Startzeit</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, start_time: e.target.value }))
                      }
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="end_date">Enddatum</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, end_date: e.target.value }))
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
                        setFormData((prev) => ({ ...prev, end_time: e.target.value }))
                      }
                    />
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Location */}
          <AccordionItem value="location" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="font-semibold">Ort</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <div className="space-y-2" data-field-id="location">
                <Label htmlFor="location">Veranstaltungsort</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="z.B. in der Gemeinde"
                  className={activeField === "location" ? "ring-2 ring-[var(--color-primary)]" : ""}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Media */}
          <AccordionItem value="media" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-gray-500" />
                <span className="font-semibold">Medien</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              <div className="space-y-2" data-field-id="main_image">
                <Label>Hauptbild</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-[var(--color-primary)] transition-colors cursor-pointer">
                  <Image className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    Klicken zum Hochladen oder Bild hierher ziehen
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Aus Medienbibliothek wählen
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Flyer (PDF)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-[var(--color-primary)] transition-colors cursor-pointer">
                  <FileText className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">PDF hochladen</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Settings */}
          <AccordionItem value="settings" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-500" />
                <span className="font-semibold">Einstellungen</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Featured</Label>
                  <p className="text-xs text-gray-500">Auf Startseite hervorheben</p>
                </div>
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_featured: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="external_link">Externer Link</Label>
                <div className="flex gap-2">
                  <LinkIcon className="h-4 w-4 text-gray-400 mt-3" />
                  <Input
                    id="external_link"
                    value={formData.external_link}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, external_link: e.target.value }))
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </PreviewLayout>
  )
}
