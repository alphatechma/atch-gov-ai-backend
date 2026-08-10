import { IsString, MinLength } from 'class-validator';

export class ResetAccessPasswordDto {
  @IsString()
  @MinLength(6)
  password: string;
}
