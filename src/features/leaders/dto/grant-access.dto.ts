import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class GrantAccessDto {
  /** Opcional: usa o e-mail da liderança se não for informado. */
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  password: string;
}
