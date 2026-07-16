import { IsIn } from 'class-validator';

export class ActualizarAsistenciaDto {
  @IsIn(['presente', 'ausente', 'tardanza'])
  estado!: 'presente' | 'ausente' | 'tardanza';
}
