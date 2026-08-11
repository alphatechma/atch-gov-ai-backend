import { IsObject, IsOptional } from 'class-validator';

/**
 * Reenvio de uma solicitação rejeitada: a liderança ajusta os campos propostos
 * e volta a solicitação para PENDENTE.
 */
export class ResubmitVoterChangeRequestDto {
  @IsObject()
  @IsOptional()
  proposedChanges?: Record<string, any>;
}
