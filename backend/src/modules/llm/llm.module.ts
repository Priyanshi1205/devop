import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmController } from './llm.controller';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [LlmController],
  providers: [LlmService, PrismaService],
  exports: [LlmService],
})
export class LlmModule {}
