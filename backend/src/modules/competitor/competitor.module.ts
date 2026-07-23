import { Module } from '@nestjs/common';
import { CompetitorService } from './competitor.service';
import { CompetitorController } from './competitor.controller';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [CompetitorController],
  providers: [CompetitorService, PrismaService],
  exports: [CompetitorService],
})
export class CompetitorModule {}
