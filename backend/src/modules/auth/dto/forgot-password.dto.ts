import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordRequestDto {
  @ApiProperty({ example: 'user@agency.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
