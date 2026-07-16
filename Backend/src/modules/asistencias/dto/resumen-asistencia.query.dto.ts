import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class ResumenAsistenciaQueryDto {
  @Type(() => Number)
  @IsInt()
  estudiante_id!: number;

  @Type(() => Number)
  @IsInt()
  curso_id!: number;
}
