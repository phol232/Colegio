import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  Max,
  Min,
} from 'class-validator';

export class CrearNotaDetalleDto {
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
