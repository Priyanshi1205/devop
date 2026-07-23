import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { CmsConnectionService } from './cms-connection.service';
import { CmsConnectionController } from './cms-connection.controller';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [ContentController, CmsConnectionController],
  providers: [ContentService, CmsConnectionService, PrismaService],
  exports: [ContentService, CmsConnectionService],
})
export class ContentModule {}
