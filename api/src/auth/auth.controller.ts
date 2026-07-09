import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { AdminUser } from '../entities/admin-user.entity';
import type { Request } from 'express';
import { AuthService, LoginResult } from './auth.service';
import type { JwtPayload } from './jwt-auth.guard';
import { Public } from './public.decorator';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  /** 2FA etkinse zorunlu; 6 haneli TOTP kodu */
  @IsOptional() @Matches(/^\d{6}$/)
  totpCode?: string;
}

class TotpCodeDto {
  @Matches(/^\d{6}$/, { message: '6 haneli doğrulama kodu girin' })
  code: string;
}

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString() @MaxLength(120)
  name: string;

  @IsString() @MinLength(10) @MaxLength(128)
  password: string;
}

class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(10, { message: 'Yeni şifre en az 10 karakter olmalı' })
  @MaxLength(128)
  newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // brute-force koruması
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto.email, dto.password, dto.totpCode);
  }

  /** 2FA kurulumu: sır + otpauth URL (QR üretimi panelde). */
  @Post('2fa/setup')
  setupTotp(@Req() req: Request & { user: JwtPayload }) {
    return this.authService.setupTotp(req.user.sub);
  }

  @Post('2fa/enable')
  @HttpCode(204)
  async enableTotp(@Req() req: Request & { user: JwtPayload }, @Body() dto: TotpCodeDto): Promise<void> {
    await this.authService.enableTotp(req.user.sub, dto.code);
  }

  @Post('2fa/disable')
  @HttpCode(204)
  async disableTotp(@Req() req: Request & { user: JwtPayload }, @Body() dto: TotpCodeDto): Promise<void> {
    await this.authService.disableTotp(req.user.sub, dto.code);
  }

  @Get('me')
  me(@Req() req: Request & { user: JwtPayload }): JwtPayload {
    return req.user;
  }

  @Get('users')
  listUsers(): Promise<Pick<AdminUser, 'id' | 'email' | 'name' | 'role' | 'createdAt'>[]> {
    return this.authService.listUsers();
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto): Promise<AdminUser> {
    return this.authService.createUser(dto.email, dto.name, dto.password);
  }

  @Delete('users/:id')
  @HttpCode(204)
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<void> {
    await this.authService.deleteUser(id, req.user.sub);
  }

  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
  }
}
