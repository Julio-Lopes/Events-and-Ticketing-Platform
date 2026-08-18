import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

/**
 * Setores ficam de fora de proposito. Alterar geometria de um evento
 * ja existente e outra operacao, com outras regras (ver EventsService).
 */
export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @Length(2, 140)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  synopsis?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @Length(2, 140)
  venue?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  city?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  doorsAt?: string;
}