import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class ActualizarNotaDetalleDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20)
  puntaje!: number;
}
