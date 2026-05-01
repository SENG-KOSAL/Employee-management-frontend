"use client"

import { useMemo, useRef, useState } from "react"
import { uploadEmployeePhoto } from "@/services/employees"
import { Camera, Check, X, Loader2 } from "lucide-react"

type Props = {
  employeeId: number | string
  photoUrl?: string | null
  onUploaded?: (payload: unknown) => void
  disabled?: boolean
  className?: string
}

export default function EmployeePhotoUploader({ employeeId, photoUrl, onUploaded, disabled = false, className = "" }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string>("")

  const getErrorMessage = (err: unknown) => {
    if (!err || typeof err !== "object") return null
    const maybe = err as {
      response?: {
        data?: {
          message?: unknown
        }
      }
    }
    const msg = maybe.response?.data?.message
    return typeof msg === "string" ? msg : null
  }

  const unwrapBody = (body: unknown) => {
    if (!body || typeof body !== "object") return body
    const rec = body as Record<string, unknown>
    return rec.data !== undefined ? rec.data : body
  }

  const previewUrl = useMemo(() => {
    if (!file) return null
    return URL.createObjectURL(file)
  }, [file])

  const effectiveUrl = previewUrl || (photoUrl ? String(photoUrl) : "")

  const clear = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setFile(null)
    setError("")
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleUpload = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!file) return

    try {
      setUploading(true)
      setError("")
      const res = await uploadEmployeePhoto(employeeId, file)
      const body = (res as { data?: unknown }).data
      const payload = unwrapBody(body)
      onUploaded?.(payload)
      clear()
    } catch (err: unknown) {
      console.error(err)
      setError(getErrorMessage(err) || "Failed to upload photo")
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null
    if (next) {
      setFile(next)
      setError("")
    }
  }

  return (
    <div className={`relative inline-flex flex-col items-center gap-3 ${className}`}>
      <div 
        onClick={() => !uploading && !disabled && inputRef.current?.click()}
        className={`
          relative group cursor-pointer overflow-hidden rounded-full border-4 border-white shadow-xl transition-all hover:shadow-2xl bg-white
          h-[150px] w-[150px] flex-shrink-0
          ${uploading || disabled ? "opacity-80 cursor-not-allowed" : ""}
        `}
      >
        {/* Main Image or Placeholder */}
        <div className="h-full w-full flex items-center justify-center bg-gray-100">
          {effectiveUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={effectiveUrl} 
              alt="Employee photo" 
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
            />
          ) : (
            <UserPlaceholder />
          )}
        </div>

        {/* Hover Overlay - Only show if not uploading and not disabled */}
        {!uploading && !disabled && (
          <div className={`
            absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white transition-opacity duration-300
            ${file ? "opacity-0" : "opacity-0 group-hover:opacity-100"}
          `}>
            <Camera className="w-8 h-8 mb-2 opacity-90" />
            <span className="text-xs font-medium uppercase tracking-wider">Change</span>
          </div>
        )}

        {/* Uploading Overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
        
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading || disabled}
        />
      </div>

      {/* Floating Actions when file is selected - positioned relative to the circle */}
      {file && !uploading && (
        <div className="absolute bottom-4 right-0 left-0 flex justify-center z-30 animate-in fade-in slide-in-from-bottom-2 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto bg-white/90 p-1.5 rounded-full shadow-lg backdrop-blur-sm border border-gray-100">
            <button
              onClick={handleUpload}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white shadow hover:bg-green-600 transition-colors"
              title="Save Photo"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={clear}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition-colors"
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute -bottom-12 w-48 text-center p-2 text-xs bg-red-100 text-red-600 rounded-md shadow-sm border border-red-200 z-20">
          {error}
        </div>
      )}
    </div>
  )
}

function UserPlaceholder() {
  return (
    <div className="flex flex-col items-center text-gray-300">
      <svg
        className="h-20 w-20"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    </div>
  )
}

