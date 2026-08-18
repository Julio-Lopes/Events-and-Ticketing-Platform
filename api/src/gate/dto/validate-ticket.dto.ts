import { IsOptional, IsString, ValidateIf } from 'class-validator';

/**
 * A portaria manda `payload` (lido do QR pela camera) OU `code`
 * (digitado a mao). Um dos dois e obrigatorio, nunca os dois.
 */
export class ValidateTicketDto {
  @IsString()
  eventId!: string;

  @IsOptional()
  @IsString()
  payload?: string;

  @ValidateIf((o) => !o.payload)
  @IsString({ message: 'Informe o QR lido ou o codigo digitado.' })
  code?: string;
}