import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * O cadastro publico so cria CLIENTE. Contas de ORGANIZADOR e PORTARIA
 * nascem pelo seed, porque deixar qualquer um se registrar como portaria
 * tornaria a validacao de ingresso decorativa.
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