import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegistroAsistenciaDto {
  @IsInt()
  estudiante_id!: number;

  @IsIn(['presente', 'ausente', 'tardanza'])
  estado!: 'presente' | 'ausente' | 'tardanza';
}

export class RegistrarAsistenciaMasivaDto {
  @IsInt()
  curso_id!: number;

  @IsDateString()
  fecha!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RegistroAsistenciaDto)
  registros!: RegistroAsistenciaDto[];
}
