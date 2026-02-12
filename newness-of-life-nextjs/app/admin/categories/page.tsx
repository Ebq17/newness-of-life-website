"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical } from "lucide-react"
import { generateSlug } from "@/lib/utils"

// Mock data - will be replaced with Supabase data
const mockCategories = [
  { id: "1", slug: "gottesdienst", name: "Gottesdienst", color: "#2563EB", icon: "church", sort_order: 1, is_active: true },
  { id: "2", slug: "gebet", name: "Gebet", color: "#10B981", icon: "hands-praying", sort_order: 2, is_active: true },
  { id: "3", slug: "jugend", name: "Jugend", color: "#8B5CF6", icon: "users", sort_order: 3, is_active: true },
  { id: "4", slug: "special", name: "Special Event", color: "#F59E0B", icon: "star", sort_order: 4, is_active: true },
  { id: "5", slug: "gemeinschaft", name: "Gemeinschaft", color: "#EC4899", icon: "heart", sort_order: 5, is_active: true },
]

const iconOptions = [
  { value: "calendar", label: "Kalender" },
  { value: "church", label: "Kirche" },
  { value: "hands-praying", label: "Gebet" },
  { value: "users", label: "Gruppe" },
  { value: "star", label: "Stern" },
  { value: "heart", label: "Herz" },
  { value: "music", label: "Musik" },
  { value: "book", label: "Buch" },
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState(mockCategories)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<typeof mockCategories[0] | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    color: "#2563EB",
    icon: "calendar",
    is_active: true,
  })

  const handleOpenDialog = (category?: typeof mockCategories[0]) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        slug: category.slug,
        color: category.color,
        icon: category.icon,
        is_active: category.is_active,
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: "",
        slug: "",
        color: "#2563EB",
        icon: "calendar",
        is_active: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug: !editingCategory ? generateSlug(value) : prev.slug,
    }))
  }

  const handleSubmit = () => {
    // TODO: Save to Supabase
    console.log("Saving category:", formData)
    setIsDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    // TODO: Delete from Supabase
    console.log("Deleting category:", id)
    setCategories((prev) => prev.filter((cat) => cat.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kategorien</h1>
          <p className="text-gray-500 mt-1">
            Verwalte Event-Kategorien mit Farben und Icons.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Neue Kategorie
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Kategorie bearbeiten" : "Neue Kategorie"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? "Bearbeite die Details dieser Kategorie."
                  : "Erstelle eine neue Event-Kategorie."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="z.B. Gottesdienst, Jugend..."
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
                  placeholder="kategorie-slug"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Farbe</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, color: e.target.value }))
                    }
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, color: e.target.value }))
                    }
                    placeholder="#2563EB"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="grid grid-cols-4 gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, icon: icon.value }))
                      }
                      className={`p-3 rounded-lg border text-center text-sm transition-colors ${
                        formData.icon === icon.value
                          ? "border-[var(--color-primary)] bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {icon.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Aktiv</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSubmit}>Speichern</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Kategorien</CardTitle>
          <CardDescription>
            Ziehe die Kategorien, um die Reihenfolge zu ändern.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Farbe</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-gray-500">{category.slug}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm text-gray-500">{category.color}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {category.is_active ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Aktiv
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Inaktiv
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(category)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
