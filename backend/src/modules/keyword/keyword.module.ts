import { Module } from '@nestjs/common';
import { KeywordService } from './keyword.service';
import { KeywordController } from './keyword.controller';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DataForSeoService } from './dataforseo.service';

@Module({
  controllers: [KeywordController],
  providers: [KeywordService, PrismaService, DataForSeoService],
  exports: [KeywordService],
})
export class KeywordModule {}
