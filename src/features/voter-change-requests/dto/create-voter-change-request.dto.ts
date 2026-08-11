import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { VoterChangeRequestType } from '../../../shared/enums/features';

export class CreateVoterChangeRequestDto {
  @IsUUID()
  @IsNotEmpty()
  voterId: string;

  @IsEnum(VoterChangeRequestType)
  type: VoterChangeRequestType;

  /** Obrigatório para UPDATE; ignorado para DELETE. */
  @ValidateIf((o) => o.type === VoterChangeRequestType.UPDATE)
  @IsObject()
  @IsNotEmpty()
  proposedChanges?: Record<string, any>;
}
