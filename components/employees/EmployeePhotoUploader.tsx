"use client"

import { useMemo, useRef, useState } from "react"
import { uploadEmployeePhoto } from "@/services/employees"
import { Camera, Upload, X } from "lucide-react"

type Props = {
  employeeId: number | string
  photoUrl?: string | null
  onUploaded?: (payload: unknown) => void
  className?: string
}

export default function EmployeePhotoUploader({ employeeId, photoUrl, onUploaded, className }: Props) {
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

  const clear = () => {
    setFile(null)
    setError("")
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a photo first")
      return
    }

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

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="size-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
            {effectiveUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={effectiveUrl} alt="Employee photo" className="h-full w-full object-cover" />
            ) : (
              <Camera className="size-6 text-gray-400" />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null
                setFile(next)
                setError("")
              }}
            />

            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm text-sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="size-4" /> Select Photo
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow text-sm disabled:opacity-50"
              onClick={handleUpload}
              disabled={uploading || !file}
              title={!file ? "Select a file first" : ""}
            >
              Upload
            </button>

            {file ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm text-sm"
                onClick={clear}
                disabled={uploading}
              >
                <X className="size-4" /> Clear
              </button>
            ) : null}
          </div>

          {file ? <div className="text-xs text-gray-500">Selected: {file.name}</div> : null}
          {error ? <div className="text-xs text-red-600">{error}</div> : null}
        </div>
      </div>
    </div>
  )
}
