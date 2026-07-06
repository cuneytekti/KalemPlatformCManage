import { Injectable } from '@nestjs/common';
import { PdfService } from '../common/pdf.service';
import { Quote } from '../entities/quote.entity';

export type QuoteLang = 'az' | 'tr' | 'en';

const I18N: Record<QuoteLang, Record<string, string>> = {
  az: {
    title: 'Qiymət Təklifi',
    customer: 'Müştəri',
    date: 'Tarix',
    item: 'Xidmət',
    qty: 'Say',
    unitPrice: 'Vahid qiymət (aylıq)',
    lineTotal: 'Cəmi',
    users: 'İstifadəçi lisenziyası',
    posTerminals: 'POS kassa',
    mobileTerminals: 'Mobil terminal',
    monthlyTotal: 'AYLIQ CƏMİ',
    vatNote: 'Qiymətlərə ƏDV daxil deyil.',
    validity: 'Bu təklif 30 gün etibarlıdır.',
    footer: 'Kalem Platform — kalemplatform.com',
  },
  tr: {
    title: 'Fiyat Teklifi',
    customer: 'Müşteri',
    date: 'Tarih',
    item: 'Hizmet',
    qty: 'Adet',
    unitPrice: 'Birim fiyat (aylık)',
    lineTotal: 'Tutar',
    users: 'Kullanıcı lisansı',
    posTerminals: 'POS kasa',
    mobileTerminals: 'Mobil terminal',
    monthlyTotal: 'AYLIK TOPLAM',
    vatNote: 'Fiyatlara KDV dahil değildir.',
    validity: 'Bu teklif 30 gün geçerlidir.',
    footer: 'Kalem Platform — kalemplatform.com',
  },
  en: {
    title: 'Price Quote',
    customer: 'Customer',
    date: 'Date',
    item: 'Service',
    qty: 'Qty',
    unitPrice: 'Unit price (monthly)',
    lineTotal: 'Total',
    users: 'User license',
    posTerminals: 'POS register',
    mobileTerminals: 'Mobile terminal',
    monthlyTotal: 'MONTHLY TOTAL',
    vatNote: 'Prices exclude VAT.',
    validity: 'This quote is valid for 30 days.',
    footer: 'Kalem Platform — kalemplatform.com',
  },
};

const LOCALE: Record<QuoteLang, string> = { az: 'az-AZ', tr: 'tr-TR', en: 'en-US' };

@Injectable()
export class QuotePdfService {
  constructor(private readonly pdf: PdfService) {}

  renderHtml(quote: Quote, lang: QuoteLang): string {
    const t = I18N[lang];
    const money = (v: string) => `${parseFloat(v).toFixed(2)} ${quote.currency}`;
    const line = (qty: number, unit: string) => money((qty * parseFloat(unit)).toFixed(2));
    const rows = [
      { label: t.users, qty: quote.seats, unit: quote.pricePerUser },
      { label: t.posTerminals, qty: quote.posTerminals, unit: quote.pricePerPosTerminal },
      ...(quote.mobileTerminals > 0
        ? [{ label: t.mobileTerminals, qty: quote.mobileTerminals, unit: quote.pricePerMobileTerminal }]
        : []),
    ];
    return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 48px; }
  .head { display: flex; justify-content: space-between; align-items: baseline;
          border-bottom: 3px solid #0ea5e9; padding-bottom: 12px; }
  h1 { color: #0ea5e9; font-size: 26px; margin: 0; }
  .brand { font-weight: 700; font-size: 18px; }
  .meta { margin: 24px 0; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;
       border-bottom: 2px solid #e2e8f0; padding: 8px; }
  td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; }
  td.num, th.num { text-align: right; }
  .total td { font-weight: 700; font-size: 16px; border-top: 3px solid #0ea5e9; border-bottom: none; }
  .notes { margin-top: 32px; color: #64748b; font-size: 12px; line-height: 1.8; }
  .footer { margin-top: 48px; text-align: center; color: #94a3b8; font-size: 11px; }
</style></head><body>
  <div class="head"><h1>${t.title}</h1><div class="brand">Kalem Platform</div></div>
  <div class="meta">
    <div><strong>${t.customer}:</strong> ${this.escape(quote.customerName)}</div>
    ${quote.contactEmail ? `<div><strong>E-mail:</strong> ${this.escape(quote.contactEmail)}</div>` : ''}
    <div><strong>${t.date}:</strong> ${new Date(quote.createdAt).toLocaleDateString(LOCALE[lang])}</div>
  </div>
  <table>
    <thead><tr><th>${t.item}</th><th class="num">${t.qty}</th><th class="num">${t.unitPrice}</th><th class="num">${t.lineTotal}</th></tr></thead>
    <tbody>
      ${rows.map((r) => `<tr><td>${r.label}</td><td class="num">${r.qty}</td><td class="num">${money(r.unit)}</td><td class="num">${line(r.qty, r.unit)}</td></tr>`).join('')}
      <tr class="total"><td colspan="3">${t.monthlyTotal}</td><td class="num">${money(quote.monthlyTotal)}</td></tr>
    </tbody>
  </table>
  <div class="notes">${t.vatNote}<br>${t.validity}${quote.notes ? `<br><br>${this.escape(quote.notes)}` : ''}</div>
  <div class="footer">${t.footer}</div>
</body></html>`;
  }

  async renderPdf(quote: Quote, lang: QuoteLang): Promise<Buffer> {
    return this.pdf.htmlToPdf(this.renderHtml(quote, lang));
  }

  private escape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
