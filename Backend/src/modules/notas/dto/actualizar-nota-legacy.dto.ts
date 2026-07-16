import { Type } from 'class-transformer';
import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class ActualizarNotaLegacyDto {
  @IsInt()
  estudiante_id!: number;

  @IsInt()
  curso_id!: number;

  @IsInt()
  @Min(1)
  @Max(4)
  unidad!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20)
  puntaje!: number;
}
