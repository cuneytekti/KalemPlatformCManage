import {
  BadRequestException, Body, Controller, Headers, Post, RawBodyRequest, Req, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator';
import { Tenant } from '../entities/tenant.entity';
import { CreateTenantDto } from '../tenants/dto/create-tenant.dto';
import { TenantsService } from '../tenants/tenants.service';

/**
 * Web sitesi satış webhook'u. İstek gövdesi HMAC-SHA256 ile imzalanır:
 *   X-Kalem-Signature: hex(hmac_sha256(WEBHOOK_SECRET, rawBody))
 */
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly config: ConfigService,
  ) {}

  @Public() // güvenlik HMAC imzasıyla sağlanır
  @Post('sales')
  async onSale(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-kalem-signature') signature: string | undefined,
    @Body() dto: CreateTenantDto,
  ): Promise<Tenant> {
    this.verifySignature(req.rawBody, signature);
    return this.tenantsService.createAndProvision(dto);
  }

  private verifySignature(rawBody: Buffer | undefined, signature: string | undefined): void {
    const secret = this.config.get<string>('webhookSecret');
    if (!secret) throw new BadRequestException('WEBHOOK_SECRET yapılandırılmamış');
    if (!rawBody || !signature) throw new UnauthorizedException('İmza eksik');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const given = Buffer.from(signature, 'hex');
    const want = Buffer.from(expected, 'hex');
    if (given.length !== want.length || !timingSafeEqual(given, want)) {
      throw new UnauthorizedException('Geçersiz imza');
    }
  }
}
