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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../shared/guards/module-access.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RequiresModule } from '../../shared/decorators/requires-module.decorator';
import { leaderScopeWhere } from '../../shared/utils/leader-scope';

@Controller('appointments')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('agenda')
export class AppointmentsController {
  constructor(private service: AppointmentsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.tenantId, undefined, leaderScopeWhere(req));
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(req.tenantId, id, leaderScopeWhere(req));
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateAppointmentDto) {
    const scope = leaderScopeWhere(req);
    if (scope) (dto as any).leaderId = scope.leaderId;
    return this.service.create(req.tenantId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.service.update(req.tenantId, id, dto, leaderScopeWhere(req));
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(req.tenantId, id, leaderScopeWhere(req));
  }
}
