import { Role } from '../../prisma/client';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

/**
 * O cadastro publico so cria CLIENTE. Contas de ORGANIZADOR e PORTARIA
 * nascem pelo seed ou por um endpoint administrativo, porque deixar
 * qualquer um se registrar como portaria destruiria a validacao.
 */
export class RegisterDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class CreateStaffDto extends RegisterDto {
  @IsEnum(Role)
  role!: Role;
}
