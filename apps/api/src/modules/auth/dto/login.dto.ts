import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsEmail, IsOptional, MinLength, Matches } from 'class-validator'

export class LoginDto {
  @ApiPropertyOptional({ example: 'joao@transportadora.com.br' })
  @IsEmail()
  @IsOptional()
  email?: string

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsString()
  @Matches(/^\+55[1-9][0-9]{9,10}$/, { message: 'Telefone inválido. Use +5511999999999' })
  @IsOptional()
  phone?: string

  @ApiPropertyOptional()
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string
}
