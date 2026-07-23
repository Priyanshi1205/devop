import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class GenerateArticleDto {
  @ApiProperty({ example: 'uuid-project-id-here', description: 'Associated Project ID' })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ example: 'uuid-website-id-here', description: 'Associated Website ID', required: false })
  @IsUUID()
  @IsOptional()
  websiteId?: string;

  @ApiProperty({ example: 'best winter boots 2026', description: 'Target focus keyword' })
  @IsString()
  @IsNotEmpty()
  keyword: string;

  @ApiProperty({ example: 'Blog', description: 'Content type: Blog, Service Page, Landing Page' })
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiProperty({ example: 'United States', description: 'Target country for local optimizations' })
  @IsString()
  @IsNotEmpty()
  targetCountry: string;

  @ApiProperty({ example: 'English', description: 'Target language' })
  @IsString()
  @IsNotEmpty()
  targetLanguage: string;

  @ApiProperty({ example: 'Top 10 Winter Boots for Heavy Snow', description: 'Optional custom article title', required: false })
  @IsString()
  @IsOptional()
  title?: string;
}
