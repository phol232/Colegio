import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SolicitarMatriculaDto {
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class AprobarMatriculaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seccion_id!: number;
}

export class RechazarMatriculaDto {
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class ReasignarSeccionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seccion_id!: number;
}

export class RegistrarDecisionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  matricula_origen_id!: number;

  @IsString()
  resultado!: 'promovido' | 'repite' | 'egresado';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  grado_destino_id?: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}

export class ListarMatriculasQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodo_id?: number;

  @IsOptional()
  @IsString()
  estado?: 'pendiente' | 'activa' | 'rechazada' | 'retirada';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  grado_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  seccion_id?: number;

  @IsOptional()
  @IsString()
  busqueda?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
