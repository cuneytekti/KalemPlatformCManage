import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MaxLength(120)
  name: string;

  /** Subdomain — yalnız küçük harf/rakam/tire, harfle başlar */
  @Matches(/^[a-z][a-z0-9-]{2,30}$/, {
    message: 'slug küçük harfle başlamalı; yalnız a-z, 0-9 ve tire içerebilir (3-31 karakter)',
  })
  slug: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  licensedUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  licensedPosTerminals?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  licensedMobileTerminals?: number;

  @IsOptional()
  @IsIn(['STANDALONE', 'LOGO_TIGER', 'NETSIS', 'SAP', 'GENERIC_REST'])
  erpType?: string;
}
