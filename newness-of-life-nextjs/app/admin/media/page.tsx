"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Upload,
  Search,
  MoreHorizontal,
  Trash2,
  Download,
  Copy,
  Image as ImageIcon,
  FileText,
  Grid,
  List,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Mock data
const mockMedia = [
  {
    id: "1",
    name: "event-hero.jpg",
    type: "image/jpeg",
    size: "1.2 MB",
    url: "/images/event-hero.jpg",
    created_at: "2024-01-15",
  },
  {
    id: "2",
    name: "gottesdienst-flyer.pdf",
    type: "application/pdf",
    size: "456 KB",
    url: "/files/gottesdienst-flyer.pdf",
    created_at: "2024-01-14",
  },
  {
    id: "3",
    name: "jugend-event.jpg",
    type: "image/jpeg",
    size: "890 KB",
    url: "/images/jugend-event.jpg",
    created_at: "2024-01-13",
  },
  {
    id: "4",
    name: "christmas-dinner.jpg",
    type: "image/jpeg",
    size: "1.5 MB",
    url: "/images/christmas-dinner.jpg",
    created_at: "2024-01-12",
  },
  {
    id: "5",
    name: "neujahr-flyer.pdf",
    type: "application/pdf",
    size: "678 KB",
    url: "/files/neujahr-flyer.pdf",
    created_at: "2024-01-11",
  },
  {
    id: "6",
    name: "worship-night.jpg",
    type: "image/jpeg",
    size: "950 KB",
    url: "/images/worship-night.jpg",
    created_at: "2024-01-10",
  },
]

export default function MediaPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedMedia, setSelectedMedia] = useState<typeof mockMedia[0] | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const filteredMedia = mockMedia.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isImage = (type: string) => type.startsWith("image/")

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    // TODO: Show toast notification
    console.log("URL copied:", url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medien</h1>
          <p className="text-gray-500 mt-1">
            Verwalte Bilder und Dokumente für deine Events.
          </p>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Hochladen
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Dateien durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center mb-6">
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">
              Dateien hierher ziehen oder klicken zum Hochladen
            </p>
            <p className="text-sm text-gray-400">
              JPG, PNG, WebP, GIF oder PDF (max. 10MB)
            </p>
          </div>

          {/* Media Grid/List */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredMedia.map((item) => (
                <div
                  key={item.id}
                  className="group relative border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedMedia(item)
                    setIsDialogOpen(true)
                  }}
                >
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    {isImage(item.type) ? (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-gray-400" />
                      </div>
                    ) : (
                      <FileText className="h-12 w-12 text-red-500" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" size="sm">
                      Details
                    </Button>
                  </div>
                  <div className="p-2">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.size}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMedia.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {isImage(item.type) ? (
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    ) : (
                      <FileText className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.size} • {item.created_at}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleCopyUrl(item.url)}>
                        <Copy className="h-4 w-4 mr-2" />
                        URL kopieren
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Herunterladen
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}

          {filteredMedia.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Keine Dateien gefunden.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMedia?.name}</DialogTitle>
            <DialogDescription>Datei-Details und Aktionen</DialogDescription>
          </DialogHeader>
          {selectedMedia && (
            <div className="grid gap-6 py-4">
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                {isImage(selectedMedia.type) ? (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-20 w-20 text-gray-400" />
                  </div>
                ) : (
                  <FileText className="h-20 w-20 text-red-500" />
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Dateityp:</span>
                  <span>{selectedMedia.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Größe:</span>
                  <span>{selectedMedia.size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Hochgeladen:</span>
                  <span>{selectedMedia.created_at}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500 block mb-1">URL:</span>
                  <div className="flex gap-2">
                    <Input
                      value={selectedMedia.url}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyUrl(selectedMedia.url)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Herunterladen
                </Button>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
