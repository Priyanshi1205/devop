import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCmsConnectionDto } from './dto/create-cms-connection.dto';

@Injectable()
export class CmsConnectionService {
  constructor(private prisma: PrismaService) {}

  private async validateProjectOwnership(projectId: string, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) {
      throw new ForbiddenException('You do not have access to this project or it does not exist');
    }
  }

  async findAll(projectId: string, orgId: string) {
    await this.validateProjectOwnership(projectId, orgId);
    return this.prisma.cmsConnection.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const conn = await this.prisma.cmsConnection.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!conn || conn.project.organizationId !== orgId) {
      throw new NotFoundException(`CMS Connection with ID ${id} not found`);
    }
    return conn;
  }

  async create(dto: CreateCmsConnectionDto, orgId: string) {
    await this.validateProjectOwnership(dto.projectId, orgId);
    return this.prisma.cmsConnection.create({
      data: {
        projectId: dto.projectId,
        cmsType: dto.cmsType,
        siteUrl: dto.siteUrl || null,
        username: dto.username || null,
        apiKey: dto.apiKey || null,
        defaultStatus: dto.defaultStatus || 'draft',
      },
    });
  }

  async remove(id: string, orgId: string) {
    const conn = await this.findOne(id, orgId);
    await this.prisma.cmsConnection.delete({
      where: { id: conn.id },
    });
    return { success: true };
  }
}
