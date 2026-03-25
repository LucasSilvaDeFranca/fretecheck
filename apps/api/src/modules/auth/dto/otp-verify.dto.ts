import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, Length, Matches } from 'class-validator'

export class OtpVerifyDto {
  @ApiProperty({ example: 'joao@transportadora.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email!: string

  @ApiProperty({ example: '123456', description: 'OTP de 6 dígitos recebido por email' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP deve ter 6 dígitos numéricos' })
  code!: string
}
