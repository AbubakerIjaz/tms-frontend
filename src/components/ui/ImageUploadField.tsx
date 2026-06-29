import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'

interface ImageUploadFieldProps {
  file: File | null
  onChange: (file: File | null) => void
  label?: string
  error?: string
  existingUrl?: string | null
}

export function ImageUploadField({
  file,
  onChange,
  label = 'Image',
  error,
  existingUrl,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const displayUrl = previewUrl || existingUrl || null

  function clearImage() {
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>

      {displayUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          <div className="aspect-[4/3]">
            <img src={displayUrl} alt="Preview" className="h-full w-full object-cover" />
          </div>
          <div className="absolute right-2 top-2 flex gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-white/95 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-white"
            >
              Change
            </button>
            <button
              type="button"
              onClick={clearImage}
              className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
          </div>
          {file && (
            <p className="truncate border-t border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
              {file.name}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center transition hover:border-brand-300 hover:bg-brand-50/40"
        >
          <ImagePlus className="mb-2 text-slate-400" size={28} />
          <p className="text-sm font-medium text-slate-600">Click to upload image</p>
          <p className="mt-1 text-xs text-slate-400">JPG, PNG, WebP — max 5 MB</p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
