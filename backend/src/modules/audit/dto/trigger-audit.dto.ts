import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator';

export class TriggerAuditDto {
  @ApiProperty({ example: 'uuid-website-id-here', description: 'Website ID to crawl' })
  @IsUUID()
  @IsNotEmpty()
  websiteId: string;

  @ApiProperty({ example: 500, description: 'Maximum pages to crawl' })
  @IsInt()
  @Min(1)
  @Max(10000)
  maxPages: number;

  @ApiProperty({ example: true, description: 'Evaluate javascript execution' })
  @IsBoolean()
  crawlJS: boolean;
}
