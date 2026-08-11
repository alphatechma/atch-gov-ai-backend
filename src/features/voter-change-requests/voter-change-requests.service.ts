import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { VoterChangeRequest } from './voter-change-request.entity';
import { CreateVoterChangeRequestDto } from './dto/create-voter-change-request.dto';
import { ResubmitVoterChangeRequestDto } from './dto/resubmit-voter-change-request.dto';
import { VotersService } from '../voters/voters.service';
import { Voter } from '../voters/voter.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../../core/audit-log/audit-log.service';
import { AuditAction, UserRole } from '../../shared/enums';
import {
  NotificationType,
  VoterChangeRequestStatus,
  VoterChangeRequestType,
} from '../../shared/enums/features';
import {
  leaderScopeId,
  leaderScopeWhere,
} from '../../shared/utils/leader-scope';

/** Campos do eleitor que podem ser propostos para alteração / usados no snapshot. */
const VOTER_EDITABLE_FIELDS: (keyof Voter)[] = [
  'name',
  'cpf',
  'phone',
  'email',
  'birthDate',
  'gender',
  'address',
  'neighborhood',
  'city',
  'state',
  'zipCode',
  'voterRegistration',
  'votingZone',
  'votingSection',
  'votingLocation',
  'supportLevel',
  'confidenceLevel',
  'tags',
  'notes',
];

/** Papéis que aprovam solicitações e são notificados quando uma nova é aberta. */
const APPROVER_ROLES: UserRole[] = [UserRole.TENANT_ADMIN, UserRole.MANAGER];

@Injectable()
export class VoterChangeRequestsService {
  constructor(
    @InjectRepository(VoterChangeRequest)
    private requestsRepo: Repository<VoterChangeRequest>,
    private votersService: VotersService,
    private notificationsService: NotificationsService,
    private auditLogService: AuditLogService,
  ) {}

  /** Reduz um eleitor aos campos editáveis, para snapshot/diff. */
  private snapshotOf(voter: Voter): Record<string, any> {
    const snap: Record<string, any> = {};
    for (const field of VOTER_EDITABLE_FIELDS) {
      snap[field] = voter[field] ?? null;
    }
    return snap;
  }

  /** Mantém apenas as chaves editáveis do payload proposto. */
  private sanitizeChanges(changes: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const field of VOTER_EDITABLE_FIELDS) {
      if (changes[field] !== undefined) clean[field] = changes[field];
    }
    return clean;
  }

  async create(req: any, dto: CreateVoterChangeRequestDto) {
    const tenantId = req.tenantId;
    // Garante que o eleitor existe e pertence à liderança (404 se não for dela).
    const voter = await this.votersService.findOne(
      tenantId,
      dto.voterId,
      leaderScopeWhere(req),
    );

    let proposedChanges: Record<string, any> | null = null;
    if (dto.type === VoterChangeRequestType.UPDATE) {
      const clean = this.sanitizeChanges(dto.proposedChanges ?? {});
      if (Object.keys(clean).length === 0) {
        throw new BadRequestException(
          'Nenhum campo válido para alteração foi informado.',
        );
      }
      proposedChanges = clean;
    }

    const request = this.requestsRepo.create({
      tenantId,
      voterId: voter.id,
      leaderId: voter.leaderId ?? null,
      requestedById: req.user.id,
      type: dto.type,
      status: VoterChangeRequestStatus.PENDENTE,
      proposedChanges,
      snapshotBefore: this.snapshotOf(voter),
    });
    const saved = await this.requestsRepo.save(request);

    await this.notifyApprovers(
      tenantId,
      NotificationType.CHANGE_REQUEST_CREATED,
      voter.name,
      dto.type,
      saved,
    );

    return saved;
  }

  /**
   * Lista solicitações. Liderança vê apenas as suas (escopo por leaderId);
   * ADM/gestão vê todas do tenant. Filtro opcional por status.
   */
  async findAll(req: any, status?: VoterChangeRequestStatus) {
    const leaderScope = leaderScopeId(req);
    const qb = this.requestsRepo
      .createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId: req.tenantId });

    if (leaderScope !== undefined) {
      qb.andWhere('r.leaderId = :leaderScope', { leaderScope });
    }
    if (status) {
      qb.andWhere('r.status = :status', { status });
    }
    return qb.orderBy('r.createdAt', 'DESC').getMany();
  }

  async findOne(req: any, id: string) {
    const request = await this.requestsRepo.findOne({
      where: { id, tenantId: req.tenantId },
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada');

    // Liderança só enxerga as próprias solicitações.
    const leaderScope = leaderScopeId(req);
    if (leaderScope !== undefined && request.leaderId !== leaderScope) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    return request;
  }

  /** ADM aprova: aplica a alteração/exclusão no eleitor e fecha a solicitação. */
  async approve(req: any, id: string) {
    const request = await this.findOne(req, id);
    this.assertPending(request);

    if (request.type === VoterChangeRequestType.UPDATE) {
      await this.votersService.update(
        request.tenantId,
        request.voterId,
        (request.proposedChanges ?? {}) as DeepPartial<Voter>,
      );
    } else {
      await this.votersService.remove(request.tenantId, request.voterId);
    }

    request.status = VoterChangeRequestStatus.APROVADA;
    request.reviewedById = req.user.id;
    request.reviewedAt = new Date();
    request.reviewNote = null;
    const saved = await this.requestsRepo.save(request);

    await this.auditLogService.log({
      tenantId: request.tenantId,
      userId: req.user.id,
      action:
        request.type === VoterChangeRequestType.DELETE
          ? AuditAction.DELETE
          : AuditAction.UPDATE,
      entity: 'voter',
      entityId: request.voterId,
      changes: {
        via: 'voter-change-request',
        requestId: request.id,
        before: request.snapshotBefore,
        proposed: request.proposedChanges,
        decision: 'APROVADA',
      },
    });

    await this.notifyRequester(
      saved,
      NotificationType.CHANGE_REQUEST_APPROVED,
      'Solicitação aprovada',
      `Sua solicitação de ${this.typeLabel(saved.type)} do eleitor foi aprovada.`,
    );

    return saved;
  }

  /** ADM rejeita: registra o motivo e devolve para a liderança reeditar. */
  async reject(req: any, id: string, reviewNote?: string) {
    const request = await this.findOne(req, id);
    this.assertPending(request);

    request.status = VoterChangeRequestStatus.REJEITADA;
    request.reviewedById = req.user.id;
    request.reviewedAt = new Date();
    request.reviewNote = reviewNote ?? null;
    const saved = await this.requestsRepo.save(request);

    await this.auditLogService.log({
      tenantId: request.tenantId,
      userId: req.user.id,
      action: AuditAction.UPDATE,
      entity: 'voter-change-request',
      entityId: request.id,
      changes: { decision: 'REJEITADA', reviewNote: reviewNote ?? null },
    });

    await this.notifyRequester(
      saved,
      NotificationType.CHANGE_REQUEST_REJECTED,
      'Solicitação rejeitada',
      reviewNote
        ? `Sua solicitação foi rejeitada: ${reviewNote}`
        : 'Sua solicitação foi rejeitada. Ajuste os dados e reenvie.',
    );

    return saved;
  }

  /** Liderança reenvia uma solicitação rejeitada com os campos ajustados. */
  async resubmit(req: any, id: string, dto: ResubmitVoterChangeRequestDto) {
    const request = await this.findOne(req, id);

    if (request.requestedById !== req.user.id) {
      throw new ForbiddenException(
        'Apenas quem abriu a solicitação pode reenviá-la.',
      );
    }
    if (request.status !== VoterChangeRequestStatus.REJEITADA) {
      throw new BadRequestException(
        'Só é possível reenviar solicitações rejeitadas.',
      );
    }

    if (request.type === VoterChangeRequestType.UPDATE) {
      const clean = this.sanitizeChanges(dto.proposedChanges ?? {});
      if (Object.keys(clean).length === 0) {
        throw new BadRequestException(
          'Nenhum campo válido para alteração foi informado.',
        );
      }
      request.proposedChanges = clean;
    }

    request.status = VoterChangeRequestStatus.PENDENTE;
    request.reviewNote = null;
    request.reviewedById = null;
    request.reviewedAt = null;
    const saved = await this.requestsRepo.save(request);

    const voterName =
      (request.snapshotBefore?.name as string | undefined) ?? 'eleitor';
    await this.notifyApprovers(
      request.tenantId,
      NotificationType.CHANGE_REQUEST_RESUBMITTED,
      voterName,
      request.type,
      saved,
    );

    return saved;
  }

  private assertPending(request: VoterChangeRequest) {
    if (request.status !== VoterChangeRequestStatus.PENDENTE) {
      throw new BadRequestException(
        'Esta solicitação já foi analisada e não pode ser alterada.',
      );
    }
  }

  private typeLabel(type: VoterChangeRequestType): string {
    return type === VoterChangeRequestType.DELETE ? 'exclusão' : 'alteração';
  }

  private async notifyApprovers(
    tenantId: string,
    type: NotificationType,
    voterName: string,
    requestType: VoterChangeRequestType,
    request: VoterChangeRequest,
  ) {
    const verb =
      type === NotificationType.CHANGE_REQUEST_RESUBMITTED
        ? 'reenviou'
        : 'solicitou';
    await this.notificationsService.notifyRoles(tenantId, APPROVER_ROLES, {
      type,
      title: 'Nova solicitação de alteração',
      message: `Uma liderança ${verb} a ${this.typeLabel(requestType)} do eleitor "${voterName}".`,
      data: { requestId: request.id, voterId: request.voterId },
    });
  }

  private async notifyRequester(
    request: VoterChangeRequest,
    type: NotificationType,
    title: string,
    message: string,
  ) {
    await this.notificationsService.create({
      tenantId: request.tenantId,
      userId: request.requestedById,
      type,
      title,
      message,
      data: { requestId: request.id, voterId: request.voterId },
    });
  }
}
