import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class OptimizeContentDto {
  @ApiProperty({ example: 'uuid-project-id-here', description: 'Associated Project ID' })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ example: 'Markdown body text here...', description: 'Raw content body to analyze' })
  @IsString()
  @IsNotEmpty()
  body: string;
}
