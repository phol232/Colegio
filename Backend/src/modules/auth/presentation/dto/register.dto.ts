import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
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
