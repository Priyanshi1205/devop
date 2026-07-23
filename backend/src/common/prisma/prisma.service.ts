import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    
    // Listen to query events for timing information
    (this as any).$on('query', (e: any) => {
      const duration = e.duration;
      if (duration > 50) {
        this.logger.warn(`Slow Database Query (${duration}ms): ${e.query} - Params: ${e.params}`);
      } else if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`Database Query (${duration}ms): ${e.query}`);
      }
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
