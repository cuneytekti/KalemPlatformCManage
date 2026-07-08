import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { Tenant } from '../entities/tenant.entity';
import { MailService } from '../mail/mail.service';
import { TenantsService } from '../tenants/tenants.service';
import { PashaEcommService } from './pasha-ecomm.service';

export interface CreateOrderInput {
  companyName: string;
  contactEmail: string;
  slug: string;
  seats: number;
  posTerminals: number;
  mobileTerminals: number;
  language?: 'az' | 'tr' | 'en';
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    private readonly pasha: PashaEcommService,
    private readonly tenantsService: TenantsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  findAll(): Promise<Order[]> {
    return this.orders.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * Sipariş oluşturur ve banka ödeme sayfası URL'sini döner.
   * Fiyat DAİMA sunucuda, panel birim fiyatlarından hesaplanır —
   * istemciden gelen tutara güvenilmez.
   */
  async createOrder(input: CreateOrderInput, clientIp: string): Promise<{ orderId: string; redirectUrl: string }> {
    if (!this.pasha.enabled) {
      throw new BadRequestException('Ödeme sistemi yapılandırılmamış (PASHA_MERCHANT_HANDLER)');
    }
    const slugTaken =
      (await this.tenants.findOneBy({ slug: input.slug })) ||
      (await this.orders.findOneBy({ slug: input.slug, status: OrderStatus.PENDING_PAYMENT }));
    if (slugTaken) throw new BadRequestException(`'${input.slug}' subdomain'i kullanımda`);

    const prices = this.config.get<{ user: string; pos: string; mobile: string }>('defaultPrices')!;
    const cents = (v: string) => Math.round(parseFloat(v) * 100);
    const totalMinor =
      input.seats * cents(prices.user) +
      input.posTerminals * cents(prices.pos) +
      input.mobileTerminals * cents(prices.mobile);

    const order = await this.orders.save(
      this.orders.create({
        companyName: input.companyName,
        contactEmail: input.contactEmail,
        slug: input.slug,
        seats: input.seats,
        posTerminals: input.posTerminals,
        mobileTerminals: input.mobileTerminals,
        monthlyTotal: (totalMinor / 100).toFixed(2),
        currency: 'AZN',
        status: OrderStatus.PENDING_PAYMENT,
        clientIp,
      }),
    );

    const { transId, redirectUrl } = await this.pasha.registerTransaction(
      totalMinor,
      clientIp,
      `Kalem Platform abonelik — ${input.slug} (ilk ay)`,
      input.language ?? 'az',
    );
    order.pashaTransId = transId;
    await this.orders.save(order);
    this.logger.log(`Sipariş oluşturuldu: ${order.id} (${input.slug}, ${order.monthlyTotal} AZN)`);
    return { orderId: order.id, redirectUrl };
  }

  /**
   * Banka dönüş callback'i: sonuç HER ZAMAN sunucudan-sunucuya (command=c)
   * doğrulanır. Başarılıysa tenant kurulumunu başlatır ve karşılama
   * e-postası gönderir. İdempotent: aynı trans_id ikinci kez gelirse
   * mevcut durum döner (çifte kurulum olmaz).
   */
  async handleCallback(transId: string): Promise<{ ok: boolean; orderId: string }> {
    const order = await this.orders.findOneBy({ pashaTransId: transId });
    if (!order) throw new NotFoundException('Sipariş bulunamadı');
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return { ok: order.status !== OrderStatus.FAILED, orderId: order.id };
    }

    const { ok, resultCode } = await this.pasha.checkTransaction(transId, order.clientIp ?? '0.0.0.0');
    order.resultCode = resultCode;
    if (!ok) {
      order.status = OrderStatus.FAILED;
      await this.orders.save(order);
      this.logger.warn(`Ödeme başarısız: sipariş=${order.id} kod=${resultCode}`);
      return { ok: false, orderId: order.id };
    }

    order.status = OrderStatus.PAID;
    await this.orders.save(order);
    this.logger.log(`Ödeme onaylandı: sipariş=${order.id} (${order.monthlyTotal} AZN)`);

    const tenant = await this.tenantsService.createAndProvision({
      name: order.companyName,
      slug: order.slug,
      contactEmail: order.contactEmail,
      licensedUsers: order.seats,
      licensedPosTerminals: order.posTerminals,
      licensedMobileTerminals: order.mobileTerminals,
    });
    order.tenantId = tenant.id;
    order.status = OrderStatus.PROVISIONED;
    await this.orders.save(order);

    const baseDomain = this.config.get<string>('tenant.baseDomain');
    void this.mail.send(
      order.contactEmail,
      'Kalem Platform — Hesabınız hazırlanıyor 🎉',
      `Sayın ${order.companyName},

Ödemeniz alındı, teşekkür ederiz. Sisteminiz kuruluyor; birkaç dakika içinde hazır olacak.

Adresiniz:      https://${order.slug}.${baseDomain}
Kullanıcı adı:  admin
Geçici şifre:   Admin@123

Güvenliğiniz için ilk girişte şifrenizi mutlaka değiştirin.

Aylık aboneliğiniz: ${order.seats} kullanıcı, ${order.posTerminals} POS kasa, ${order.mobileTerminals} mobil terminal — ${order.monthlyTotal} AZN/ay.

Sorularınız için: 012 526 22 22 · info@kalemyazilim.az
Kalem Yazılım`,
    );
    return { ok: true, orderId: order.id };
  }

  /** ECOMM gün sonu kapanışı — her gece 23:50 Bakü. */
  @Cron('50 23 * * *', { timeZone: 'Asia/Baku' })
  async closeBusinessDay(): Promise<void> {
    try {
      await this.pasha.closeBusinessDay();
    } catch (err) {
      this.logger.error(`Gün sonu kapanışı başarısız: ${err instanceof Error ? err.message : err}`);
    }
  }
}
