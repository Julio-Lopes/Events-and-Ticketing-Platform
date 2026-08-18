import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Informe um e-mail valido.' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'A senha tem no minimo 6 caracteres.' })
  password!: string;
}
