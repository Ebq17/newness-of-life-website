"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface PreviewLayoutProps {
  children: React.ReactNode
  previewUrl: string
  title: string
  backUrl: string
  onSave?: () => Promise<void>
  isDraft?: boolean
  onPublish?: () => Promise<void>
}

type ViewportSize = "desktop" | "tablet" | "mobile"

const viewportSizes: Record<ViewportSize, { width: string; icon: React.ElementType }> = {
  desktop: { width: "100%", icon: Monitor },
  tablet: { width: "768px", icon: Tablet },
  mobile: { width: "375px", icon: Smartphone },
}

export function PreviewLayout({
  children,
  previewUrl,
  title,
  backUrl,
  onSave,
  isDraft = true,
  onPublish,
}: PreviewLayoutProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [viewport, setViewport] = useState<ViewportSize>("desktop")
  const [isPreviewVisible, setIsPreviewVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Refresh the iframe
  const refreshPreview = useCallback(() => {
    if (iframeRef.current) {
      setIsRefreshing(true)
      iframeRef.current.src = iframeRef.current.src
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }, [])

  // Handle save
  const handleSave = async () => {
    if (!onSave) return
    setIsSaving(true)
    try {
      await onSave()
      setLastSaved(new Date())
      // Auto-refresh preview after save
      setTimeout(refreshPreview, 300)
    } catch (error) {
      console.error("Save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle publish
  const handlePublish = async () => {
    if (!onPublish) return
    setIsPublishing(true)
    try {
      await onPublish()
      setLastSaved(new Date())
      refreshPreview()
    } catch (error) {
      console.error("Publish failed:", error)
    } finally {
      setIsPublishing(false)
    }
  }

  // Listen for messages from iframe (for click-to-edit)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "CLICK_TO_EDIT") {
        const fieldId = event.data.fieldId
        const element = document.querySelector(`[data-field-id="${fieldId}"]`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
          element.classList.add("ring-2", "ring-[var(--color-primary)]")
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-[var(--color-primary)]")
          }, 2000)
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Bar */}
      <header className="h-14 bg-white border-b flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href={backUrl}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </Link>
          <div className="h-6 w-px bg-gray-200" />
          <h1 className="font-semibold text-gray-900">{title}</h1>
          {isDraft && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
              Entwurf
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport Switcher */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {(Object.keys(viewportSizes) as ViewportSize[]).map((size) => {
              const Icon = viewportSizes[size].icon
              return (
                <button
                  key={size}
                  onClick={() => setViewport(size)}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    viewport === size
                      ? "bg-white shadow text-[var(--color-primary)]"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              )
            })}
          </div>

          <div className="h-6 w-px bg-gray-200" />

          {/* Preview Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPreviewVisible(!isPreviewVisible)}
          >
            {isPreviewVisible ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Vorschau aus
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Vorschau an
              </>
            )}
          </Button>

          {/* Refresh */}
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshPreview}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")}
            />
            Aktualisieren
          </Button>

          {/* Open in new window */}
          <Button variant="ghost" size="sm" asChild>
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Neues Fenster
            </a>
          </Button>

          <div className="h-6 w-px bg-gray-200" />

          {/* Save/Publish */}
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-gray-500">
                Zuletzt gespeichert:{" "}
                {lastSaved.toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Speichern..." : "Speichern"}
            </Button>
            {onPublish && (
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={isPublishing}
              >
                {isPublishing ? "Veröffentlichen..." : "Veröffentlichen"}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview Panel */}
        {isPreviewVisible && (
          <div
            className={cn(
              "bg-gray-200 flex flex-col transition-all duration-300",
              isFullscreen ? "fixed inset-0 z-50" : "flex-1"
            )}
          >
            {/* Preview Header */}
            <div className="h-10 bg-gray-700 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-gray-400 text-xs ml-4 font-mono">
                  {previewUrl}
                </span>
              </div>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-gray-400 hover:text-white"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* iframe Container */}
            <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
              <div
                className="bg-white shadow-2xl rounded-lg overflow-hidden transition-all duration-300"
                style={{
                  width: viewportSizes[viewport].width,
                  height: viewport === "desktop" ? "100%" : "auto",
                  maxWidth: "100%",
                }}
              >
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  className="w-full h-full border-0"
                  style={{
                    minHeight: viewport === "desktop" ? "100%" : "800px",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Editor Panel */}
        <div
          className={cn(
            "bg-white border-l overflow-auto transition-all duration-300",
            isPreviewVisible ? "w-[450px] flex-shrink-0" : "flex-1"
          )}
        >
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
