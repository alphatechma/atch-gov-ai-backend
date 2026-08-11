import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoterChangeRequestsService } from './voter-change-requests.service';
import { VoterChangeRequestsController } from './voter-change-requests.controller';
import { VoterChangeRequest } from './voter-change-request.entity';
import { TenantModule } from '../../core/modules/tenant-module.entity';
import { VotersModule } from '../voters/voters.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../../core/audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VoterChangeRequest, TenantModule]),
    VotersModule,
    NotificationsModule,
    AuditLogModule,
  ],
  controllers: [VoterChangeRequestsController],
  providers: [VoterChangeRequestsService],
  exports: [VoterChangeRequestsService],
})
export class VoterChangeRequestsModule {}
