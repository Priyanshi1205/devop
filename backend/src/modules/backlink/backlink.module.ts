import { Module } from '@nestjs/common';
import { BacklinkService } from './backlink.service';
import { BacklinkController } from './backlink.controller';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [BacklinkController],
  providers: [BacklinkService, PrismaService],
  exports: [BacklinkService],
})
export class BacklinkModule {}
