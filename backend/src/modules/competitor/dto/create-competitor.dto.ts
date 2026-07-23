import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateCompetitorDto {
  @ApiProperty({ example: 'uuid-project-id-here', description: 'Associated Project ID' })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ example: 'competitor.com', description: 'Competitor domain' })
  @IsString()
  @IsNotEmpty()
  domain: string;
}
