import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength, IsString } from 'class-validator';

export class ResetPasswordRequestDto {
  @ApiProperty({ description: 'The signed reset JWT token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewPassword123', description: 'New account password (min 6 characters)' })
  @MinLength(6)
  @IsNotEmpty()
  password: string;
}
