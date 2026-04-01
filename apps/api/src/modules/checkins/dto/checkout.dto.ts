import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsString, Min, Max, MaxLength } from 'class-validator'

export class CheckoutDto {
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

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Max(99999)
  accuracy!: number

  @ApiProperty({ example: 'DACTE-12345', description: 'Número do comprovante de finalização' })
  @IsString()
  @MaxLength(150)
  checkoutDocNumero!: string

  @ApiProperty({ description: 'URL do comprovante (PDF/foto)' })
  @IsString()
  checkoutDocUrl!: string
}
