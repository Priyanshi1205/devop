import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'GoCodeTech', description: 'Name of the project/client' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'SEO campaign for GoCodeTech', description: 'Description of the project/client', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
