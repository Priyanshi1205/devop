import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CalculateGeoDto {
  @ApiProperty({ example: 'uuid-keyword-id-here', description: 'Keyword target ID' })
  @IsUUID()
  @IsNotEmpty()
  keywordId: string;

  @ApiProperty({ example: 'ChatGPT', description: 'Generative search engine (ChatGPT, Gemini, Perplexity)' })
  @IsString()
  @IsNotEmpty()
  engine: string;
}
