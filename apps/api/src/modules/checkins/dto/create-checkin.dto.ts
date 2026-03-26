import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  Min,
  Max,
  MaxLength,
  Length,
  Matches,
} from 'class-validator'

export class CreateCheckinDto {
  @ApiProperty({ example: 'ABC1D23', description: 'Placa do veículo' })
  @IsString()
  @MaxLength(10)
  placa!: string

  @ApiProperty({ example: -23.5505 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number

  @ApiProperty({ example: -46.6333 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number

  @ApiPropertyOptional({ example: 'VOLKSWAGEN' })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  marca?: string

  @ApiPropertyOptional({ example: 'Constellation 25.420' })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  modelo?: string

  @ApiProperty({ example: 25, description: 'Capacidade de carga em toneladas' })
  @IsNumber()
  @Min(0.1, { message: 'Capacidade de carga deve ser maior que 0' })
  @Max(1000000, { message: 'Capacidade de carga máxima: 1.000.000' })
  capacidadeCargaTon!: number

  @ApiProperty({ example: 15, description: 'Precisão GPS em metros (máx: 500)' })
  @IsNumber()
  @Max(99999, { message: 'Precisão GPS inválida' })
  accuracy!: number

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  photoUrl?: string

  @ApiPropertyOptional({ example: '123456789' })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  cteNumero?: string

  @ApiPropertyOptional({ example: '12345678901234567890123456789012345678901234' })
  @IsString()
  @Length(44, 44, { message: 'Chave CT-e deve ter 44 dígitos' })
  @Matches(/^\d{44}$/)
  @IsOptional()
  cteChave?: string

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(150)
  @IsOptional()
  terminalId?: string

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(150)
  @IsOptional()
  observacoes?: string
}
