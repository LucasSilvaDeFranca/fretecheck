import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'checkin-media'

@Injectable()
export class StorageService {
  private supabase: SupabaseClient

  constructor(config: ConfigService) {
    this.supabase = createClient(
      config.getOrThrow('SUPABASE_URL'),
      config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    )
  }

  /**
   * Gera uma URL pré-assinada para upload direto ao Supabase Storage.
   * O arquivo vai do browser direto ao Supabase — não passa pelo servidor.
   * O path inclui o timestamp de captura para rastreabilidade legal.
   */
  async createPresignedUpload(params: {
    folder: string
    filename: string
    mimeType: string
    capturedAt: string // ISO 8601
  }): Promise<{ uploadUrl: string; token: string; publicUrl: string; path: string }> {
    const ts = params.capturedAt.replace(/[:.]/g, '-').slice(0, 19) // 2026-03-25T14-30-00
    const ext = params.filename.split('.').pop()?.toLowerCase() ?? 'bin'
    const rand = Math.random().toString(36).slice(2, 8)
    const path = `${params.folder}/${ts}_${rand}.${ext}`

    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path)

    if (error || !data) {
      throw new InternalServerErrorException(`Storage presign error: ${error?.message}`)
    }

    const publicUrl = this.supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

    return {
      uploadUrl: data.signedUrl,
      token: data.token,
      publicUrl,
      path,
    }
  }
}
