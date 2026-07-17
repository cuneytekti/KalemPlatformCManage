import {
  IsEmail, IsEnum, IsInt, IsNumberString, IsOptional, IsString, Max, MaxLength, Min,
} from 'class-validator';
import { QuoteDiscountType } from '../entities/quote.entity';

export class CreateQuoteDto {
  @IsString() @MaxLength(120)
  customerName: string;

  @IsOptional() @IsString() @MaxLength(120)
  contactName?: string;

  @IsOptional() @IsEmail()
  contactEmail?: string;

  @IsInt() @Min(1) @Max(1000)
  seats: number;

  @IsInt() @Min(1) @Max(200)
  posTerminals: number;

  @IsInt() @Min(0) @Max(500)
  mobileTerminals: number;

  @IsNumberString()
  pricePerUser: string;

  @IsNumberString()
  pricePerPosTerminal: string;

  @IsNumberString()
  pricePerMobileTerminal: string;

  @IsOptional() @IsString() @MaxLength(8)
  currency?: string;

  @IsOptional() @IsString() @MaxLength(1800)
  notes?: string;

  @IsOptional() @IsNumberString()
  setupFee?: string;

  @IsOptional() @IsEnum(QuoteDiscountType)
  discountType?: QuoteDiscountType;

  @IsOptional() @IsNumberString()
  discountValue?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  projectDurationText?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  paymentTermsText?: string;
}
