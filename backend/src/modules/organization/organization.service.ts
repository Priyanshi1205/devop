import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateOrgDto } from './dto/update-org.dto';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        projects: true,
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return org;
  }

  async update(id: string, updateOrgDto: UpdateOrgDto) {
    await this.findOne(id);
    return this.prisma.organization.update({
      where: { id },
      data: { name: updateOrgDto.name },
    });
  }
}
