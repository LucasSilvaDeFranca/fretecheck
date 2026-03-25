import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  Matches,
} from 'class-validator'
import { Role } from '@fretecheck/types'

export class RegisterDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string

  @ApiPropertyOptional({ example: 'joao@transportadora.com.br' })
  @IsEmail()
  @IsOptional()
  email?: string

  @ApiPropertyOptional({ example: '+5511999999999', description: 'Formato E.164' })
  @IsString()
  @Matches(/^\+55[1-9][0-9]{9,10}$/, { message: 'Telefone inválido. Use +5511999999999' })
  @IsOptional()
  phone?: string

  @ApiPropertyOptional({ example: '529.982.247-25' })
  @IsString()
  @IsOptional()
  cpf?: string

  @ApiPropertyOptional({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string

  @ApiPropertyOptional({ enum: Role, default: Role.MOTORISTA })
  @IsEnum(Role)
  @IsOptional()
  role?: Role

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  empresaId?: string
}
