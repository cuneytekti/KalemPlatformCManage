import { Injectable } from '@nestjs/common';
import { PdfService } from '../common/pdf.service';
import { Invoice } from '../entities/invoice.entity';
import { Tenant } from '../entities/tenant.entity';

export type InvoiceLang = 'az' | 'tr' | 'en';

const I18N: Record<InvoiceLang, Record<string, string>> = {
  az: {
    title: 'Hesab-Faktura', customer: 'Müştəri', period: 'Dövr', due: 'Son ödəniş tarixi',
    item: 'Xidmət', qty: 'Say', unitPrice: 'Vahid qiymət', lineTotal: 'Cəmi',
    total: 'ÜMUMİ MƏBLƏĞ', vatNote: 'Qiymətlərə ƏDV daxil deyil.',
    footer: 'Kalem Yazılım · Həydar Əliyev pros. 105-N, Nərimanov, Bakı · 012 526 22 22 · info@kalemyazilim.az',
  },
  tr: {
    title: 'Fatura', customer: 'Müşteri', period: 'Dönem', due: 'Son ödeme tarihi',
    item: 'Hizmet', qty: 'Adet', unitPrice: 'Birim fiyat', lineTotal: 'Tutar',
    total: 'GENEL TOPLAM', vatNote: 'Fiyatlara KDV dahil değildir.',
    footer: 'Kalem Yazılım · Həydar Əliyev pros. 105-N, Nərimanov, Bakü · 012 526 22 22 · info@kalemyazilim.az',
  },
  en: {
    title: 'Invoice', customer: 'Customer', period: 'Period', due: 'Due date',
    item: 'Service', qty: 'Qty', unitPrice: 'Unit price', lineTotal: 'Total',
    total: 'GRAND TOTAL', vatNote: 'Prices exclude VAT.',
    footer: 'Kalem Yazılım · Heydar Aliyev ave. 105-N, Narimanov, Baku · +994 12 526 22 22 · info@kalemyazilim.az',
  },
};

@Injectable()
export class InvoicePdfService {
  constructor(private readonly pdf: PdfService) {}

  renderHtml(invoice: Invoice, tenant: Tenant, lang: InvoiceLang): string {
    const t = I18N[lang];
    const money = (v: string) => `${parseFloat(v).toFixed(2)} ${invoice.currency}`;
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
  .notes { margin-top: 32px; color: #64748b; font-size: 12px; }
  .footer { margin-top: 48px; text-align: center; color: #94a3b8; font-size: 10px; }
</style></head><body>
  <div class="head"><h1>${t.title} · ${invoice.period}</h1><div class="brand">Kalem Platform</div></div>
  <div class="meta">
    <div><strong>${t.customer}:</strong> ${this.escape(tenant.name)} (${tenant.slug}.kalemplatform.com)</div>
    <div><strong>${t.period}:</strong> ${invoice.period}</div>
    ${invoice.dueDate ? `<div><strong>${t.due}:</strong> ${invoice.dueDate}</div>` : ''}
  </div>
  <table>
    <thead><tr><th>${t.item}</th><th class="num">${t.qty}</th><th class="num">${t.unitPrice}</th><th class="num">${t.lineTotal}</th></tr></thead>
    <tbody>
      ${invoice.lines.map((l) => `<tr><td>${this.escape(l.label)}</td><td class="num">${l.qty}</td><td class="num">${money(l.unitPrice)}</td><td class="num">${money(l.total)}</td></tr>`).join('')}
      <tr class="total"><td colspan="3">${t.total}</td><td class="num">${money(invoice.total)}</td></tr>
    </tbody>
  </table>
  <div class="notes">${t.vatNote}</div>
  <div class="footer">${t.footer}</div>
</body></html>`;
  }

  renderPdf(invoice: Invoice, tenant: Tenant, lang: InvoiceLang): Promise<Buffer> {
    return this.pdf.htmlToPdf(this.renderHtml(invoice, tenant, lang));
  }

  private escape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
