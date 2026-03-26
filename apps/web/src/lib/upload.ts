import { createClient, SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'checkin-media'

// Cliente lazy — só criado no primeiro uso (evita crash no build do Next.js)
let _supabase: SupabaseClient | null = null

function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://mctarmhneuwlylykxice.supabase.co'
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jdGFybWhuZXV3bHlseWt4aWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDQwNTIsImV4cCI6MjA5MDAyMDA1Mn0.MNccpg47qADJK4iPKniDq1ZnbNJddjgjHm-OL1gmPLk'
    _supabase = createClient(url, key)
  }
  return _supabase
}

export interface UploadResult {
  publicUrl: string
  path: string
  capturedAt: Date
}

/**
 * Faz upload de um arquivo direto para o Supabase Storage.
 * O caminho inclui o timestamp de captura para rastreabilidade legal.
 */
export async function uploadMedia(
  file: File,
  folder: string,
  capturedAt: Date = new Date(),
): Promise<UploadResult> {
  const ts = capturedAt.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const rand = Math.random().toString(36).slice(2, 8)
  const path = `${folder}/${ts}_${rand}.${ext}`

  const supabase = getSupabase()

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })

  if (error) throw new Error(error.message ?? 'Falha ao enviar arquivo')

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return { publicUrl: data.publicUrl, path, capturedAt }
}
