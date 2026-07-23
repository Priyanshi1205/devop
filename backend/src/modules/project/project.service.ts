import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto, orgId: string) {
    return this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        description: createProjectDto.description,
        organizationId: orgId,
      },
    });
  }

  async findAll(orgId: string) {
    return this.prisma.project.findMany({
      where: { organizationId: orgId },
      include: {
        websites: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
