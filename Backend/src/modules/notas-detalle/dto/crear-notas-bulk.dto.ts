import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class NotaBulkItemDto {
  @IsInt()
  evaluacion_id!: number;

  @IsInt()
  estudiante_id!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20)
  puntaje!: number;
}

export class CrearNotasBulkDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NotaBulkItemDto)
  notas!: NotaBulkItemDto[];
}
