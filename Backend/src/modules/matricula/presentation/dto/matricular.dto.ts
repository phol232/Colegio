import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MatricularDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  grado_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  seccion_id!: number;
}
