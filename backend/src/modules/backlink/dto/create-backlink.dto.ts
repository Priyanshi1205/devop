import { IsString, IsNotEmpty, IsUrl, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBacklinkDto {
  @ApiProperty({ example: 'https://magicbricks.com/indore-plots', description: 'Source URL referring to your site' })
  @IsUrl()
  @IsNotEmpty()
  sourceUrl: string;

  @ApiProperty({ example: 'https://airengroup.in', description: 'Target landing page URL on your site' })
  @IsUrl()
  @IsNotEmpty()
  targetUrl: string;

  @ApiProperty({ example: 'luxury plots in indore', required: false, description: 'Anchor text used for the link' })
  @IsString()
  @IsOptional()
  anchorText?: string;

  @ApiProperty({ example: 82, required: false, description: 'Domain authority / Domain rating score (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  domainAuthority?: number;

  @ApiProperty({ example: false, required: false, description: 'True if the link has a rel="nofollow" attribute' })
  @IsBoolean()
  @IsOptional()
  isNofollow?: boolean;
}
