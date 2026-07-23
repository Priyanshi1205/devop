import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateOrgDto {
  @ApiProperty({ example: 'Acme Enterprises', description: 'Name of the organization' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
