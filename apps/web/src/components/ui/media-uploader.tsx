'use client'

import { useRef, useState, useCallback } from 'react'
import { uploadMedia } from '@/lib/upload'
import { applyWatermark, type WatermarkMeta } from '@/lib/watermark'

// ─── Types ───────────────────────────────────────────────────────────────────

export type MediaType = 'image' | 'video' | 'document' | 'any'

interface MediaFile {
  id: string
  file: File
  capturedAt: Date
  status: 'pending' | 'uploading' | 'done' | 'error'
  url?: string
  preview?: string
  errorMsg?: string
}

interface MediaUploaderProps {
  folder: string
  accept?: MediaType[]
  multiple?: boolean
  maxFiles?: number
  maxSizeMB?: number
  onChange?: (urls: string[]) => void
  watermarkMetadata?: WatermarkMeta
  onOriginalsChange?: (urls: string[]) => void
  label?: string
  hint?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isImage(file: File): boolean {
  return file.type.startsWith('image/')
}

function getFileExtIcon(file: File) {
  if (file.type.startsWith('image/')) return 'IMG'
  if (file.type.startsWith('video/')) return 'VID'
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) return 'PDF'
  if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) return 'DOC'
  return 'ARQ'
}

function createPreview(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => resolve(undefined)
      reader.readAsDataURL(file)
    } else if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file)
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = url
      video.currentTime = 0.5
      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 160
        canvas.height = 90
        canvas.getContext('2d')?.drawImage(video, 0, 0, 160, 90)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
        URL.revokeObjectURL(url)
      }
      video.onerror = () => { URL.revokeObjectURL(url); resolve(undefined) }
    } else {
      resolve(undefined)
    }
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MediaUploader({
  folder,
  multiple = false,
  maxFiles = 10,
  maxSizeMB = 50,
  onChange,
  watermarkMetadata,
  onOriginalsChange,
  label,
  hint,
}: MediaUploaderProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<MediaFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const originalUrlsRef = useRef<Record<string, string>>({})

  const doneUrls = (updated: MediaFile[]) =>
    updated.filter((f) => f.status === 'done' && f.url).map((f) => f.url!)

  const processFiles = useCallback(
    async (selected: FileList | File[]) => {
      const arr = Array.from(selected)
      const maxSizeBytes = maxSizeMB * 1024 * 1024

      const newEntries: MediaFile[] = []
      for (const file of arr) {
        if (files.length + newEntries.length >= maxFiles) break
        if (file.size > maxSizeBytes) {
          newEntries.push({
            id: Math.random().toString(36).slice(2),
            file,
            capturedAt: new Date(),
            status: 'error',
            errorMsg: `Arquivo muito grande (máx ${maxSizeMB} MB)`,
          })
          continue
        }
        const preview = await createPreview(file)
        newEntries.push({
          id: Math.random().toString(36).slice(2),
          file,
          capturedAt: new Date(),
          status: 'pending',
          preview,
        })
      }

      setFiles((prev) => [...prev, ...newEntries])

      for (const entry of newEntries) {
        if (entry.status !== 'pending') continue
        setFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: 'uploading' } : f))
        try {
          if (watermarkMetadata && isImage(entry.file)) {
            const [origResult, wmFile] = await Promise.all([
              uploadMedia(entry.file, folder + '/orig', entry.capturedAt),
              applyWatermark(entry.file, watermarkMetadata),
            ])
            originalUrlsRef.current[entry.id] = origResult.publicUrl
            onOriginalsChange?.(Object.values(originalUrlsRef.current))

            const wmResult = await uploadMedia(wmFile, folder + '/wm', entry.capturedAt)
            let updatedUrls: string[] = []
            setFiles((prev) => {
              const updated = prev.map((f) =>
                f.id === entry.id ? { ...f, status: 'done' as const, url: wmResult.publicUrl } : f,
              )
              updatedUrls = doneUrls(updated)
              return updated
            })
            queueMicrotask(() => onChange?.(updatedUrls))
          } else {
            const result = await uploadMedia(entry.file, folder, entry.capturedAt)
            let updatedUrls: string[] = []
            setFiles((prev) => {
              const updated = prev.map((f) =>
                f.id === entry.id ? { ...f, status: 'done' as const, url: result.publicUrl } : f,
              )
              updatedUrls = doneUrls(updated)
              return updated
            })
            queueMicrotask(() => onChange?.(updatedUrls))
          }
        } catch (err) {
          let updatedUrls: string[] = []
          setFiles((prev) => {
            const updated = prev.map((f) =>
              f.id === entry.id
                ? { ...f, status: 'error' as const, errorMsg: (err as Error).message ?? 'Erro no upload' }
                : f,
            )
            updatedUrls = doneUrls(updated)
            return updated
          })
          queueMicrotask(() => onChange?.(updatedUrls))
        }
      }
    },
    [files.length, folder, maxFiles, maxSizeMB, onChange, watermarkMetadata, onOriginalsChange],
  )

  const remove = (id: string) => {
    delete originalUrlsRef.current[id]
    let updatedUrls: string[] = []
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id)
      updatedUrls = doneUrls(updated)
      return updated
    })
    queueMicrotask(() => {
      onChange?.(updatedUrls)
      onOriginalsChange?.(Object.values(originalUrlsRef.current))
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files)
      e.target.value = ''
    }
    setShowMenu(false)
  }

  const canAdd = files.length < maxFiles

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-text-secondary">
          {label}
          {hint && <span className="ml-1 text-text-muted font-normal text-xs">({hint})</span>}
        </label>
      )}

      {/* Drop zone */}
      {canAdd && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => isMobile ? setShowMenu(true) : fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer
            transition-colors duration-150
            ${dragOver
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-dark-500 hover:border-brand-400'
            }
          `}
        >
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <svg className="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            <p className="text-sm font-medium text-text-secondary">
              Adicionar fotos, vídeos ou documentos
            </p>
            <p className="text-xs text-text-muted">
              Arraste aqui ou toque para selecionar · máx {maxSizeMB} MB por arquivo
            </p>
            {multiple && maxFiles > 1 && (
              <p className="text-xs text-text-muted">
                {files.length}/{maxFiles} arquivos
              </p>
            )}
          </div>

          {/* Hidden inputs */}
          <input ref={galleryInputRef} type="file" className="sr-only" accept="image/*,video/*" multiple={multiple} onChange={handleInputChange} />
          <input ref={cameraInputRef} type="file" className="sr-only" accept="image/*" capture="environment" onChange={handleInputChange} />
          <input ref={fileInputRef} type="file" className="sr-only" accept="application/pdf,.pdf,.doc,.docx,image/*,video/*" multiple={multiple} onChange={handleInputChange} />
        </div>
      )}

      {/* Custom menu (aparece em qualquer browser/device) */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="relative z-50">
            <div className="absolute bottom-0 left-0 right-0 bg-dark-800 border border-dark-600 rounded-xl overflow-hidden shadow-lg">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); galleryInputRef.current?.click() }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-dark-700 transition-colors cursor-pointer border-b border-dark-600"
              >
                <svg className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                Fototeca
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); cameraInputRef.current?.click() }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-dark-700 transition-colors cursor-pointer border-b border-dark-600"
              >
                <svg className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
                Tirar Foto ou Gravar Vídeo
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); fileInputRef.current?.click() }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-dark-700 transition-colors cursor-pointer"
              >
                <svg className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                </svg>
                Escolher Arquivos
              </button>
            </div>
          </div>
        </>
      )}

      {/* Preview list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-lg border border-dark-600 bg-dark-700 p-2"
            >
              <div className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-dark-800 flex items-center justify-center">
                {f.preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.preview} alt="" className="w-full h-full object-cover" />
                    {isImage(f.file) && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                        <p className="text-white text-[8px] leading-none text-center">
                          {f.capturedAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs font-bold text-brand-500">{getFileExtIcon(f.file)}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{f.file.name}</p>
                <p className="text-xs text-text-muted">
                  {formatSize(f.file.size)} · {formatDate(f.capturedAt)}
                </p>

                {f.status === 'uploading' && (
                  <div className="flex items-center gap-1 mt-1">
                    <svg className="animate-spin h-3 w-3 text-brand-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-xs text-brand-500">Enviando...</span>
                  </div>
                )}
                {f.status === 'done' && (
                  <p className="text-xs text-teal-400 mt-1 flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Enviado
                  </p>
                )}
                {f.status === 'error' && (
                  <p className="text-xs text-red-400 mt-1">{f.errorMsg}</p>
                )}
              </div>

              {f.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  className="shrink-0 text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                  aria-label="Remover"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
