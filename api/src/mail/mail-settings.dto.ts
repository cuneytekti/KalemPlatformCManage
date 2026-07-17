import { Type } from 'class-transformer';
import {
  IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min,
} from 'class-validator';
import { MailSecurityMode } from '../entities/mail-settings.entity';

export class MailSettingsInput {
  @IsBoolean()
  enabled: boolean;

  @IsString() @MaxLength(255)
  host: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(65535)
  port: number;

  @IsEnum(MailSecurityMode)
  security: MailSecurityMode;

  @IsBoolean()
  authEnabled: boolean;

  @IsOptional() @IsString() @MaxLength(255)
  username?: string;

  @IsOptional() @IsString() @MaxLength(512)
  password?: string;

  @IsString() @MaxLength(120)
  fromName: string;

  @IsEmail() @MaxLength(255)
  fromEmail: string;
}

export class TestMailSettingsInput extends MailSettingsInput {
  @IsEmail() @MaxLength(255)
  recipient: string;
}
