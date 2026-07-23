import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({ example: 'price_1234567890', description: 'Stripe Product Price ID' })
  @IsString()
  @IsNotEmpty()
  priceId: string;

  @ApiProperty({ example: 'starter', description: 'Selected plan name' })
  @IsString()
  plan?: string;
}
