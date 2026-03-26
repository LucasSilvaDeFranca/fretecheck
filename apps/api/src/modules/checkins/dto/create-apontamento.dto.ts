import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsEnum, IsOptional, IsArray, IsUrl, MaxLength } from 'class-validator'
import { CausaType } from '@fretecheck/types'

export class CreateApontamentoDto {
  @ApiProperty({ enum: CausaType, example: CausaType.EMBARCADOR })
  @IsEnum(CausaType)
  causa!: CausaType

  @ApiProperty({ example: '11222333000181', description: 'CNPJ do responsável pelo atraso' })
  @IsString()
  @MaxLength(150)
  causadorCnpj!: string

  @ApiProperty({ example: 'Armazém Central São Paulo Ltda' })
  @IsString()
  @MaxLength(150)
  causadorNome!: string

  @ApiPropertyOptional({ example: 'Fila de descarga excessiva por falta de operadores' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  descricao?: string

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  evidenciaUrls?: string[]

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  evidenciaOriginaisUrls?: string[]
}
