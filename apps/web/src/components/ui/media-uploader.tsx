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
  /** Pasta no bucket onde os arquivos serão salvos (ex: "checkins/user-id") */
  folder: string
  /** Tipos permitidos */
  accept?: MediaType[]
  /** Permitir múltiplos arquivos */
  multiple?: boolean
  /** Máximo de arquivos */
  maxFiles?: number
  /** Tamanho máximo por arquivo em MB */
  maxSizeMB?: number
  /** Callback com lista de URLs públicas conforme o upload é concluído */
  onChange?: (urls: string[]) => void
  /** Se fornecido, aplica marca d'água em imagens antes do upload */
  watermarkMetadata?: WatermarkMeta
  /** Callback com URLs dos arquivos originais (sem watermark) */
  onOriginalsChange?: (urls: string[]) => void
  label?: string
  hint?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACCEPT_MAP: Record<MediaType, string> = {
  image: 'image/jpeg,image/png,image/webp,image/heic',
  video: 'video/mp4,video/quicktime,video/webm',
  document: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  any: 'image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

function buildAccept(types: MediaType[]): string {
  return [...new Set(types.flatMap((t) => ACCEPT_MAP[t].split(',')))].join(',')
}

function formatDate(d: Date): string {
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getFileIcon(file: File): string {
  if (file.type.startsWith('image/')) return '🖼️'
  if (file.type.startsWith('video/')) return '🎬'
  if (file.type === 'application/pdf') return '📄'
  return '📎'
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
  accept = ['any'],
  multiple = false,
  maxFiles = 10,
  maxSizeMB = 50,
  onChange,
  watermarkMetadata,
  onOriginalsChange,
  label,
  hint,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<MediaFile[]>([])
  const [dragOver, setDragOver] = useState(false)
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

      setFiles((prev) => {
        const merged = [...prev, ...newEntries]
        return merged
      })

      // Upload each new pending file
      for (const entry of newEntries) {
        if (entry.status !== 'pending') continue
        setFiles((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: 'uploading' } : f))
        try {
          if (watermarkMetadata && entry.file.type.startsWith('image/')) {
            // Upload original first, then watermarked version
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

  const acceptStr = buildAccept(accept)
  const canAdd = files.length < maxFiles

  const hasImage = accept.includes('image') || accept.includes('any')
  const hasVideo = accept.includes('video') || accept.includes('any')
  const hasDoc = accept.includes('document') || accept.includes('any')
  const typeLabels = [
    hasImage && 'fotos',
    hasVideo && 'vídeos',
    hasDoc && 'documentos',
  ].filter(Boolean) as string[]
  const typeText = typeLabels.join(', ').replace(/, ([^,]*)$/, ' ou $1')

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {hint && <span className="ml-1 text-gray-400 font-normal text-xs">({hint})</span>}
        </label>
      )}

      {/* Drop zone */}
      {canAdd && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer
            transition-colors duration-150
            ${dragOver
              ? 'border-brand-500 bg-brand-50'
              : 'border-gray-200 hover:border-brand-400 hover:bg-gray-50'
            }
          `}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept={acceptStr}
            multiple={multiple}
            capture="environment"
            onChange={(e) => { if (e.target.files?.length) processFiles(e.target.files) }}
          />

          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <div className="flex items-center gap-3 text-2xl">
              {hasImage ? '📷' : null}
              {hasVideo ? '🎬' : null}
              {hasDoc ? '📄' : null}
            </div>
            <p className="text-sm font-medium text-gray-700">
              {multiple ? `Adicionar ${typeText}` : `Capturar ${typeText.replace('fotos', 'foto').replace('vídeos', 'vídeo').replace('documentos', 'documento')}`}
            </p>
            <p className="text-xs text-gray-400">
              Arraste aqui ou toque para abrir câmera / galeria · máx {maxSizeMB} MB por arquivo
            </p>
            {multiple && maxFiles > 1 && (
              <p className="text-xs text-gray-400">
                {files.length}/{maxFiles} arquivos
              </p>
            )}
          </div>
        </div>
      )}

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-2"
            >
              {/* Thumbnail / icon */}
              <div className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                {f.preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.preview} alt="" className="w-full h-full object-cover" />
                    {/* Timestamp overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                      <p className="text-white text-[8px] leading-none text-center">
                        {f.capturedAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </>
                ) : (
                  <span className="text-2xl">{getFileIcon(f.file)}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{f.file.name}</p>
                <p className="text-xs text-gray-400">
                  {formatSize(f.file.size)} · {formatDate(f.capturedAt)}
                </p>

                {/* Status */}
                {f.status === 'uploading' && (
                  <div className="flex items-center gap-1 mt-1">
                    <svg className="animate-spin h-3 w-3 text-brand-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-xs text-brand-600">Enviando...</span>
                  </div>
                )}
                {f.status === 'done' && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Enviado
                  </p>
                )}
                {f.status === 'error' && (
                  <p className="text-xs text-red-600 mt-1">{f.errorMsg}</p>
                )}
              </div>

              {/* Remove button */}
              {f.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  className="shrink-0 text-gray-300 hover:text-red-500 transition-colors"
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
