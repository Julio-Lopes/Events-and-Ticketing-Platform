import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CatalogSource, SectorKind } from '../../prisma/client';

/**
 * O organizador descreve a GEOMETRIA do setor, nao os assentos.
 * Mandar 96 poltronas no corpo da requisicao seria absurdo: ele informa
 * 8 fileiras de 12 e o servidor gera. Menos trafego e, principalmente,
 * impossivel chegar um mapa inconsistente pela API.
 */
export class SectorInput {
  @IsString()
  @Length(1, 40)
  name!: string;

  @IsEnum(SectorKind)
  kind!: SectorKind;

  @IsInt()
  @Min(0)
  priceCents!: number;

  /** Apenas GENERAL. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200_000)
  capacity?: number;

  /** Apenas SEATED. Fileiras nomeadas de A em diante. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(26)
  rows?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  seatsPerRow?: number;
}

export class CreateEventDto {
  @IsString()
  @Length(2, 140)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  synopsis?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  /** Preenchidos quando o evento nasce de um item do catalogo externo. */
  @IsOptional()
  @IsEnum(CatalogSource)
  source?: CatalogSource;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsString()
  @Length(2, 140)
  venue!: string;

  @IsString()
  @Length(2, 80)
  city!: string;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  doorsAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SectorInput)
  sectors!: SectorInput[];
}