import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCmsConnectionDto {
  @ApiProperty({ description: 'The project ID to link this connection to' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ enum: ['WordPress', 'Webflow', 'Custom'], description: 'Type of CMS' })
  @IsString()
  @IsEnum(['WordPress', 'Webflow', 'Custom'])
  cmsType: string;

  @ApiProperty({ description: 'Base site URL or Webhook endpoint URL', required: false })
  @IsString()
  @IsOptional()
  siteUrl?: string;

  @ApiProperty({ description: 'Username for basic authentication (WordPress only)', required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ description: 'API Key or Application Password or Webhook Secret', required: false })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiProperty({ enum: ['draft', 'publish'], description: 'Default publishing status', default: 'draft' })
  @IsString()
  @IsEnum(['draft', 'publish'])
  defaultStatus: string;
}
