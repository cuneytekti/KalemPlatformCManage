import { Body, Controller, Get, Ip, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { Order } from '../entities/order.entity';
import { PaymentsService } from './payments.service';

class CreateOrderDto {
  @IsString() @MaxLength(120)
  companyName: string;

  @IsEmail()
  contactEmail: string;

  @Matches(/^[a-z][a-z0-9-]{2,30}$/, {
    message: 'slug küçük harfle başlamalı; yalnız a-z, 0-9 ve tire (3-31 karakter)',
  })
  slug: string;

  @IsInt() @Min(1) @Max(1000)
  seats: number;

  @IsInt() @Min(1) @Max(200)
  posTerminals: number;

  @IsInt() @Min(0) @Max(500)
  mobileTerminals: number;

  @IsOptional() @IsIn(['az', 'tr', 'en'])
  language?: 'az' | 'tr' | 'en';
}

@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  /** Web sitesi satın alma akışı: sipariş + banka yönlendirme URL'si. */
  @Public() // rate limit global; fiyat sunucuda hesaplanır
  @Post('public/orders')
  createOrder(@Body() dto: CreateOrderDto, @Ip() ip: string) {
    return this.payments.createOrder(dto, ip);
  }

  /**
   * PashaBank dönüşü (ClientHandler, trans_id'yi form POST eder; bazı
   * yapılandırmalarda GET query). Sonuç bankadan doğrulanır, ardından
   * müşteri web sitesindeki sonuç sayfasına yönlendirilir.
   */
  @Public()
  @Post('public/payments/callback')
  async callbackPost(@Body('trans_id') transId: string | undefined, @Res() res: Response): Promise<void> {
    await this.finish(transId, res);
  }

  @Public()
  @Get('public/payments/callback')
  async callbackGet(@Query('trans_id') transId: string | undefined, @Res() res: Response): Promise<void> {
    await this.finish(transId, res);
  }

  /** Panel: sipariş listesi (JWT korumalı — Public değil). */
  @Get('orders')
  findAll(): Promise<Order[]> {
    return this.payments.findAll();
  }

  private async finish(transId: string | undefined, res: Response): Promise<void> {
    const base = `https://${this.config.get<string>('tenant.baseDomain')}`;
    if (!transId) {
      res.redirect(`${base}/odeme.html?netice=xeta`);
      return;
    }
    try {
      const { ok } = await this.payments.handleCallback(transId);
      res.redirect(`${base}/odeme.html?netice=${ok ? 'ugur' : 'imtina'}`);
    } catch {
      res.redirect(`${base}/odeme.html?netice=xeta`);
    }
  }
}
