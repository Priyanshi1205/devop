import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional, IsInt, IsNumber } from 'class-validator';

export class CreateKeywordDto {
  @ApiProperty({ example: 'uuid-website-id-here', description: 'Associated Website ID' })
  @IsUUID()
  @IsNotEmpty()
  websiteId: string;

  @ApiProperty({ example: 'organic winter boots', description: 'Keyword text' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ example: 4500, description: 'Search volume', required: false })
  @IsInt()
  @IsOptional()
  volume?: number;

  @ApiProperty({ example: 48, description: 'Keyword difficulty (0-100)', required: false })
  @IsInt()
  @IsOptional()
  difficulty?: number;

  @ApiProperty({ example: 1.25, description: 'Cost-Per-Click (CPC)', required: false })
  @IsNumber()
  @IsOptional()
  cpc?: number;

  @ApiProperty({ example: 'uuid-cluster-id-here', description: 'Associated keyword cluster ID', required: false })
  @IsUUID()
  @IsOptional()
  clusterId?: string;
}
