import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator'
import { StorageService } from './storage.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

class PresignDto {
  @IsString() @IsNotEmpty() folder!: string
  @IsString() @IsNotEmpty() filename!: string
  @IsString() @IsNotEmpty() mimeType!: string
  @IsDateString() @IsOptional() capturedAt?: string
}

@ApiTags('storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class StorageController {
  constructor(private storage: StorageService) {}

  @Post('presign')
  @ApiOperation({ summary: 'Gera URL pré-assinada para upload direto ao Supabase Storage' })
  async presign(@Body() dto: PresignDto) {
    return this.storage.createPresignedUpload({
      folder: dto.folder,
      filename: dto.filename,
      mimeType: dto.mimeType,
      capturedAt: dto.capturedAt ?? new Date().toISOString(),
    })
  }
}
