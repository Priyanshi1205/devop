import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateWebsiteDto {
  @ApiProperty({ example: 'acme.com', description: 'Domain name' })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiProperty({ example: 'uuid-project-id-here', description: 'Associated Project ID' })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;
}
