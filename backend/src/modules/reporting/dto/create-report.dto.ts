import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsObject } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ example: 'uuid-project-id-here', description: 'Associated Project ID' })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ example: 'Q2 Performance Report', description: 'Report name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: { modules: ['gsc', 'geo', 'seo_audit'] }, description: 'Layout configurations' })
  @IsObject()
  @IsNotEmpty()
  config: any;
}
