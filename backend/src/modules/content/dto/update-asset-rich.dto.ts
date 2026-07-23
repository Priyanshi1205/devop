import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsArray } from 'class-validator';

export class UpdateAssetRichDto {
  @ApiProperty({ example: 'Top 10 High-Performance Winter Boots', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'Markdown or HTML body content...', required: false })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiProperty({ example: 'https://acme.com/blog/winter-boots', required: false })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiProperty({ example: 'Target Focus Keyword', required: false })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiProperty({ example: 'Blog', required: false })
  @IsString()
  @IsOptional()
  contentType?: string;

  @ApiProperty({ example: 'United States', required: false })
  @IsString()
  @IsOptional()
  targetCountry?: string;

  @ApiProperty({ example: 'English', required: false })
  @IsString()
  @IsOptional()
  targetLanguage?: string;

  @ApiProperty({ example: 'SEO Title here', required: false })
  @IsString()
  @IsOptional()
  seoTitle?: string;

  @ApiProperty({ example: 'Meta Title here', required: false })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiProperty({ example: 'Meta Description here', required: false })
  @IsString()
  @IsOptional()
  metaDescription?: string;

  @ApiProperty({ example: 'H1 Header', required: false })
  @IsString()
  @IsOptional()
  h1?: string;

  @ApiProperty({ example: ['Introduction', 'Why it matters'], required: false })
  @IsArray()
  @IsOptional()
  h2Structure?: any;

  @ApiProperty({ example: [{ question: 'Is it cold?', answer: 'Yes' }], required: false })
  @IsArray()
  @IsOptional()
  faqSection?: any;

  @ApiProperty({ example: [{ pageTitle: 'Home', url: '/' }], required: false })
  @IsArray()
  @IsOptional()
  internalLinking?: any;

  @ApiProperty({ example: 'GEO Content...', required: false })
  @IsString()
  @IsOptional()
  geoOptimizedContent?: string;

  @ApiProperty({ example: 'LLM Content...', required: false })
  @IsString()
  @IsOptional()
  llmOptimizedContent?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;

  @ApiProperty({ example: [{ alt: 'Alt text', filename: 'img.jpg' }], required: false })
  @IsArray()
  @IsOptional()
  imageSuggestions?: any;

  @ApiProperty({ example: 'https://acme.com/posts/1', required: false })
  @IsString()
  @IsOptional()
  publishUrl?: string;
}
