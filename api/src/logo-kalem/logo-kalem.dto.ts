import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEmail, IsEnum, IsIn, IsInt, IsNumberString, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { QuoteActivityType } from '../entities/quote-activity.entity';
import { QuoteStatus } from '../entities/quote.entity';

export class LogoKalemLineDto {
  @IsOptional() @IsString() catalogItemId?: string;
  @IsString() @MaxLength(300) name: string;
  @IsOptional() @IsString() @MaxLength(1200) description?: string;
  @IsOptional() @IsString() @MaxLength(80) location?: string;
  @IsOptional() @IsString() @MaxLength(40) unit?: string;
  @IsOptional() @IsString() @MaxLength(8) currency?: string;
  @IsOptional() @IsNumberString() userCount?: string;
  @IsNumberString() quantity: string;
  @IsNumberString() unitPrice: string;
  @IsOptional() @IsIn(['NONE', 'FIXED', 'PERCENT']) discountType?: 'NONE' | 'FIXED' | 'PERCENT';
  @IsOptional() @IsNumberString() discountValue?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class LogoKalemSectionDto {
  @IsIn(['MAIN', 'SERVICE', 'MAINTENANCE', 'LEM']) type: 'MAIN' | 'SERVICE' | 'MAINTENANCE' | 'LEM';
  @IsString() @MaxLength(200) title: string;
  @IsString() @MaxLength(8) currency: string;
  @IsOptional() @IsIn(['ONE_TIME', 'MONTHLY', 'ANNUAL']) billingPeriod?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => LogoKalemLineDto) lines: LogoKalemLineDto[];
}

export class LogoKalemAdjustmentDto {
  @IsIn(['MAIN', 'MAINTENANCE', 'LEM']) target: 'MAIN' | 'MAINTENANCE' | 'LEM';
  @IsIn(['TAX', 'DISCOUNT', 'OTHER']) type: 'TAX' | 'DISCOUNT' | 'OTHER';
  @IsString() @MaxLength(120) label: string;
  @IsIn(['PERCENT', 'FIXED']) method: 'PERCENT' | 'FIXED';
  @IsNumberString() value: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class SaveLogoKalemQuoteDto {
  @IsString() @MaxLength(160) customerName: string;
  @IsOptional() @IsString() @MaxLength(120) contactName?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;
  @IsIn(['tr', 'az', 'en']) language: 'tr' | 'az' | 'en';
  @IsString() @MaxLength(240) projectTitle: string;
  @IsOptional() @IsString() @MaxLength(240) subject?: string;
  @IsOptional() @IsDateString() meetingDate?: string;
  @IsDateString() quoteDate: string;
  @IsString() @MaxLength(120) senderName: string;
  @IsOptional() @IsString() @MaxLength(40) senderPhone?: string;
  @IsOptional() @IsEmail() senderEmail?: string;
  @IsOptional() @IsString() @MaxLength(5000) introduction?: string;
  @IsOptional() @IsString() @MaxLength(5000) projectScope?: string;
  @IsOptional() @IsString() @MaxLength(3000) projectTeam?: string;
  @IsOptional() @IsString() @MaxLength(2000) projectDuration?: string;
  @IsOptional() @IsString() @MaxLength(2000) paymentTerms?: string;
  @IsOptional() @IsString() @MaxLength(2000) validityTerms?: string;
  @IsOptional() @IsString() @MaxLength(2000) deliveryTerms?: string;
  @IsOptional() @IsString() @MaxLength(2000) travelTerms?: string;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
  @IsOptional() @IsBoolean() includeReferences?: boolean;
  @IsOptional() @IsBoolean() includeCertificates?: boolean;
  @IsArray() @ValidateNested({ each: true }) @Type(() => LogoKalemSectionDto) sections: LogoKalemSectionDto[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => LogoKalemAdjustmentDto) adjustments: LogoKalemAdjustmentDto[];
}

export class LogoKalemActivityDto {
  @IsEnum(QuoteActivityType) type: QuoteActivityType;
  @IsOptional() @IsEnum(QuoteStatus) status?: QuoteStatus;
  @IsString() @MinLength(2) @MaxLength(2000) note: string;
  @IsOptional() @IsDateString() activityAt?: string;
}

export class LogoKalemCatalogDto {
  @IsString() @MaxLength(80) code: string;
  @IsString() @MaxLength(80) category: string;
  @IsString() @MaxLength(240) nameTr: string;
  @IsOptional() @IsString() @MaxLength(240) nameAz?: string;
  @IsOptional() @IsString() @MaxLength(240) nameEn?: string;
  @IsOptional() @IsString() @MaxLength(1200) descriptionTr?: string;
  @IsOptional() @IsString() @MaxLength(40) unit?: string;
  @IsOptional() @IsIn(['ONE_TIME', 'MONTHLY', 'ANNUAL']) billingPeriod?: string;
  @IsNumberString() defaultPrice: string;
  @IsString() @MaxLength(8) currency: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
