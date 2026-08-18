import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Um item por setor. `seatIds` para setor numerado, `quantity` para pista.
 * Os dois no mesmo formato porque o cliente pode comprar camarote e pista
 * no mesmo pedido.
 */
export class OrderItemInput {
  @IsString()
  sectorId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10, { message: 'No maximo 10 lugares por setor.' })
  seatIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10, { message: 'No maximo 10 ingressos por setor.' })
  quantity?: number;
}

export class CreateOrderDto {
  @IsString()
  eventId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items!: OrderItemInput[];
}