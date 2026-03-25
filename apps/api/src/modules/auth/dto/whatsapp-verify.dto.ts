import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches, Length } from 'class-validator'

export class WhatsappVerifyDto {
  @ApiProperty({ example: '+5511999999999' })
  @IsString()
  @Matches(/^\+55[1-9][0-9]{9,10}$/, { message: 'Telefone inválido. Use +5511999999999' })
  phone!: string

  @ApiProperty({ example: '123456', description: 'OTP de 6 dígitos recebido via WhatsApp' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP deve ter 6 dígitos numéricos' })
  code!: string
}
