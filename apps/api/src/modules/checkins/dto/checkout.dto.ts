import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, Min, Max } from 'class-validator'

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
  @Max(500, { message: 'Precisão GPS deve ser ≤ 500 metros' })
  accuracy!: number
}
