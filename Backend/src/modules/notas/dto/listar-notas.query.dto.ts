import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListarNotasQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  estudiante_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  curso_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  unidad?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  per_page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;
}
