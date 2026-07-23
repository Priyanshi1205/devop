import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateAssetDto {
  @ApiProperty({ example: 'uuid-project-id-here', description: 'Associated Project ID' })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ example: 'Best Running Shoes of 2026', description: 'Title of the content draft' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Markdown or HTML body content...', description: 'Full body content' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ example: 'https://acme.com/blog/running-shoes', description: 'Target URL', required: false })
  @IsString()
  @IsOptional()
  url?: string;
}
