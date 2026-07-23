import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CrearGradoDto {
  @IsIn(['primaria', 'secundaria'])
  nivel!: 'primaria' | 'secundaria';

  @Type(() => Number)
  @IsInt()
  numero!: number;

  @IsString()
  @MaxLength(255)
  nombre!: string;
}

export class ActualizarGradoDto {
  @IsOptional()
  @IsIn(['primaria', 'secundaria'])
  nivel?: 'primaria' | 'secundaria';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  numero?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre?: string;
}

export class CrearSeccionDto {
  @IsString()
  @MaxLength(10)
  nombre!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  capacidad?: number;
}

export class ActualizarSeccionDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  nombre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  capacidad?: number;
}

export class AsignarEstudiantesSeccionDto {
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  estudiantes_ids!: number[];
}

export class AsignarEstudianteCursoDto {
  @Type(() => Number)
  @IsInt()
  estudiante_id!: number;
}

export class CrearCursoCatalogoDto {
  @IsString()
  @MaxLength(100)
  nombre!: string;

  @IsString()
  @MaxLength(20)
  codigo!: string;

  @IsIn(['primaria', 'secundaria', 'ambos'])
  nivel!: 'primaria' | 'secundaria' | 'ambos';

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  descripcion?: string | null;
}

export class ActualizarCursoCatalogoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigo?: string;

  @IsOptional()
  @IsIn(['primaria', 'secundaria', 'ambos'])
  nivel?: 'primaria' | 'secundaria' | 'ambos';

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  descripcion?: string | null;
}

export class AsignarCursosSeccionDto {
  @Type(() => Number)
  @IsInt()
  docente_id!: number;

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  cursos_catalogo_ids!: number[];
}

export class ActualizarDocenteCursoDto {
  @Type(() => Number)
  @IsInt()
  docente_id!: number;
}

export class ActualizarConfiguracionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nombre_institucion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio_academico?: number;

  @IsOptional()
  @IsIn(['bimestral', 'trimestral', 'semestral'])
  periodo_evaluacion?: 'bimestral' | 'trimestral' | 'semestral';

  @IsOptional()
  @IsBoolean()
  modo_mantenimiento?: boolean;

  @IsOptional()
  @IsIn(['planificacion', 'matricula', 'activo', 'cerrado'])
  periodo_academico_estado?: 'planificacion' | 'matricula' | 'activo' | 'cerrado';

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  matricula_inicio?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  matricula_fin?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  grado_ingreso_id?: number | null;
}

export class CrearUsuarioDto {
  @IsEmail({}, { message: 'El email debe ser válido' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsIn(['docente', 'estudiante', 'padre', 'admin'], {
    message: 'El rol debe ser: docente, estudiante, padre o admin',
  })
  role!: 'docente' | 'estudiante' | 'padre' | 'admin';

  @IsOptional()
  @IsString()
  @MaxLength(20)
  dni?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;
}

export class CambiarEstadoUsuarioDto {
  @IsBoolean()
  activo!: boolean;
}
