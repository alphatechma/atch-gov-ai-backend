import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { VisitsService } from './visits.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../shared/guards/module-access.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RequiresModule } from '../../shared/decorators/requires-module.decorator';
import { leaderScopeWhere } from '../../shared/utils/leader-scope';

@Controller('visits')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('visits')
export class VisitsController {
  constructor(private service: VisitsService) {}

  @Get('voters')
  getVoters(@Req() req: any) {
    return this.service.getVotersForSelect(req.tenantId);
  }

  @Get('leaders')
  getLeaders(@Req() req: any) {
    return this.service.getLeadersForSelect(req.tenantId);
  }

  @Post('leaders')
  createLeader(@Req() req: any, @Body('name') name: string) {
    return this.service.createLeader(req.tenantId, name);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.tenantId, undefined, leaderScopeWhere(req));
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(req.tenantId, id, leaderScopeWhere(req));
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateVisitDto) {
    const scope = leaderScopeWhere(req);
    if (scope) (dto as any).leaderId = scope.leaderId;
    return this.service.create(req.tenantId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVisitDto,
  ) {
    return this.service.update(req.tenantId, id, dto, leaderScopeWhere(req));
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(req.tenantId, id, leaderScopeWhere(req));
  }
}
