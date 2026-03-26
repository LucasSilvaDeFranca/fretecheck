import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  Min,
  Max,
  Matches,
  Length,
} from 'class-validator'

export class CreateCheckinDto {
  @ApiProperty({ example: 'ABC1D23', description: 'Placa do veículo (Mercosul ou antigo)' })
  @IsString()
  @Matches(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, { message: 'Placa inválida' })
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

  @ApiProperty({ example: 25, description: 'Capacidade de carga em toneladas' })
  @IsNumber()
  @Min(0.1, { message: 'Capacidade de carga deve ser maior que 0' })
  @Max(100, { message: 'Capacidade de carga máxima: 100 toneladas' })
  capacidadeCargaTon!: number

  @ApiProperty({ example: 15, description: 'Precisão GPS em metros (máx: 500)' })
  @IsNumber()
  @Max(500, { message: 'Precisão GPS deve ser ≤ 500 metros' })
  accuracy!: number

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  photoUrl?: string

  @ApiPropertyOptional({ example: '123456789' })
  @IsString()
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
  @IsOptional()
  terminalId?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  observacoes?: string
}
