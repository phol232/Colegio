import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional } from 'class-validator';

export class ListarAsistenciasQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  estudiante_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  curso_id?: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @IsOptional()
  @IsIn(['presente', 'ausente', 'tardanza'])
  estado?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  per_page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;
}
