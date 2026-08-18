import { IsString, Length, Matches } from 'class-validator';

/**
 * Dados de cartao simulados. Nada disso e persistido alem dos 4 ultimos
 * digitos: guardar numero de cartao seria erro grave mesmo num teste.
 */
export class PayDto {
  @IsString()
  @Matches(/^\d{13,19}$/, { message: 'Numero de cartao invalido.' })
  cardNumber!: string;

  @IsString()
  @Length(2, 60)
  holderName!: string;

  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'Validade no formato MM/AA.' })
  expiry!: string;

  @IsString()
  @Matches(/^\d{3,4}$/, { message: 'CVV invalido.' })
  cvv!: string;
}