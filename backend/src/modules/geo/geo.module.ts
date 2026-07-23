import { Module } from '@nestjs/common';
import { GeoService } from './geo.service';
import { GeoController } from './geo.controller';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [GeoController],
  providers: [GeoService, PrismaService],
  exports: [GeoService],
})
export class GeoModule {}
