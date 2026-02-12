import { EventEditWithPreview } from "@/components/admin/event-edit-preview"

// This would fetch from Supabase in real implementation
const mockEvents: Record<string, {
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
}> = {
  "1": {
    id: "1",
    title: "Church Family Breakfast",
    slug: "church-family-breakfast",
    description: "Gemeinsames Frühstück vor dem Gottesdienst",
    start_date: "2025-11-08T09:00:00",
    end_date: "",
    all_day: false,
    location: "in der Gemeinde",
    category_id: "5",
    main_image_url: "",
    flyer_pdf_url: "",
    is_recurring: false,
    recurrence_rule: null,
    is_featured: false,
    is_published: true,
    external_link: "",
  },
  "2": {
    id: "2",
    title: "Worship Night – Youth & Young Adults",
    slug: "worship-night-youth",
    description: "Ein Abend voller Worship und Gemeinschaft für junge Leute.",
    start_date: "2025-11-23T19:00:00",
    end_date: "",
    all_day: false,
    location: "in der Gemeinde",
    category_id: "3",
    main_image_url: "",
    flyer_pdf_url: "",
    is_recurring: false,
    recurrence_rule: null,
    is_featured: true,
    is_published: true,
    external_link: "",
  },
  "3": {
    id: "3",
    title: "Christmas Celebration Dinner",
    slug: "christmas-celebration",
    description: "Feiere Weihnachten mit uns bei einem festlichen Abendessen.",
    start_date: "2025-12-20T17:00:00",
    end_date: "",
    all_day: false,
    location: "in der Gemeinde",
    category_id: "4",
    main_image_url: "",
    flyer_pdf_url: "",
    is_recurring: false,
    recurrence_rule: null,
    is_featured: true,
    is_published: true,
    external_link: "",
  },
}

interface EditEventPageProps {
  params: Promise<{ id: string }>
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params

  // TODO: Fetch event from Supabase using id
  const event = mockEvents[id] || mockEvents["1"]

  return <EventEditWithPreview initialData={event} />
}
