import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { VoterChangeRequestsService } from './voter-change-requests.service';
import { CreateVoterChangeRequestDto } from './dto/create-voter-change-request.dto';
import { ReviewVoterChangeRequestDto } from './dto/review-voter-change-request.dto';
import { ResubmitVoterChangeRequestDto } from './dto/resubmit-voter-change-request.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../shared/guards/module-access.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RequiresModule } from '../../shared/decorators/requires-module.decorator';
import { RequiresPermission } from '../../shared/decorators/requires-permission.decorator';
import { PermissionAction } from '../../shared/enums';
import { VoterChangeRequestStatus } from '../../shared/enums/features';

/**
 * Fluxo de aprovação de alterações de eleitor. Reutiliza o módulo/permissões de
 * "voters":
 *   - criar/reenviar solicitação → voters:create (liderança tem)
 *   - listar/ver               → voters:view
 *   - aprovar/rejeitar         → voters:edit (só ADM/gestão têm)
 */
@Controller('voter-change-requests')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('voters')
export class VoterChangeRequestsController {
  constructor(private service: VoterChangeRequestsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateVoterChangeRequestDto) {
    return this.service.create(req, dto);
  }

  @Get()
  findAll(@Req() req: any, @Query('status') status?: VoterChangeRequestStatus) {
    return this.service.findAll(req, status);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(req, id);
  }

  @Patch(':id/approve')
  @RequiresPermission('voters', PermissionAction.EDIT)
  approve(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.approve(req, id);
  }

  @Patch(':id/reject')
  @RequiresPermission('voters', PermissionAction.EDIT)
  reject(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewVoterChangeRequestDto,
  ) {
    return this.service.reject(req, id, dto.reviewNote);
  }

  @Patch(':id/resubmit')
  // Reenvio é ação da liderança sobre a própria solicitação → nível de "create".
  @RequiresPermission('voters', PermissionAction.CREATE)
  resubmit(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResubmitVoterChangeRequestDto,
  ) {
    return this.service.resubmit(req, id, dto);
  }
}
