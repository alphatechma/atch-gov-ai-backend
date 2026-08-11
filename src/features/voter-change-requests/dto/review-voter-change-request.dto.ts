import { IsOptional, IsString } from 'class-validator';

/** Payload da aprovação/rejeição pelo ADM. reviewNote é usado na rejeição. */
export class ReviewVoterChangeRequestDto {
  @IsString()
  @IsOptional()
  reviewNote?: string;
}
