import { IsString, MinLength } from 'class-validator';

export class CambiarPasswordDto {
  @IsString()
  current_password!: string;

  @IsString()
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  new_password!: string;

  @IsString()
  @MinLength(6)
  new_password_confirmation!: string;
}
