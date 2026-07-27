import { IsEmail, IsNotEmpty, IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateSubscriberDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  planName!: string; // 'Free Trial' | 'Starter' | 'Pro' | 'Agency'

  @IsString()
  @IsOptional()
  billingCycle?: string = 'monthly';
}

export class ChangePlanDto {
  @IsString()
  @IsNotEmpty()
  planName!: string; // 'Free Trial' | 'Starter' | 'Pro' | 'Agency'
}

export class ExtendSubscriptionDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  days?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  months?: number;
}
