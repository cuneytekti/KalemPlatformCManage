import { Injectable } from '@nestjs/common';
import { Quote } from '../entities/quote.entity';
import { KALEM_EMAIL_LOGO_BASE64 } from './quote-email-logo';

export type QuoteEmailLang = 'az' | 'tr' | 'en';

interface QuoteEmailCopy {
  subject: string;
  headline: string;
  greeting: string;
  paragraphs: string[];
  regards: string;
  team: string;
  attachment: string;
  attachmentDetail: string;
  legal: string;
}

const COPY: Record<QuoteEmailLang, QuoteEmailCopy> = {
  az: {
    subject: 'Qiymət təklifi',
    headline: 'Kalem Platform qiymət təklifiniz hazırdır',
    greeting: 'Hörmətli',
    paragraphs: [
      'Görüşümüzə əsasən hazırladığımız qiymət təklifini əlavə olaraq diqqətinizə təqdim edirik.',
      'Əməkdaşlığımızın xeyirli olmasını arzulayır, dəyərli rəyinizi gözləyirik.',
      'Hər hansı sual və ya müraciətiniz üçün telefon nömrəmiz və ya veb-saytımız vasitəsilə bizimlə əlaqə saxlaya bilərsiniz.',
    ],
    regards: 'Hörmətlə,',
    team: 'Kalem Yazılım komandası',
    attachment: 'Kalem_Platform_Qiymet_Teklifi.pdf',
    attachmentDetail: 'Korporativ qiymət təklifi · PDF əlavəsi',
    legal: 'Bu e-poçt və əlavələri yalnız göstərilən alıcı üçün nəzərdə tutulub. Təklif şərtləri əlavə edilmiş sənəddə göstərilib.',
  },
  tr: {
    subject: 'Fiyat Teklifi',
    headline: 'Kalem Platform fiyat teklifiniz hazır',
    greeting: 'Sayın',
    paragraphs: [
      'Görüşmemize istinaden hazırladığımız fiyat teklifimizi ekte bilgilerinize sunarız.',
      'İş birliğimizin hayırlı olmasını temenni eder, değerli görüşlerinizi bekleriz.',
      'Her türlü soru ve talebiniz için telefon numaramız veya web sitemiz üzerinden bizimle iletişime geçebilirsiniz.',
    ],
    regards: 'Saygılarımızla,',
    team: 'Kalem Yazılım Ekibi',
    attachment: 'Kalem_Platform_Fiyat_Teklifi.pdf',
    attachmentDetail: 'Kurumsal fiyat teklifi · PDF eki',
    legal: 'Bu e-posta ve ekleri yalnızca belirtilen alıcıya yöneliktir. Teklif koşulları ekteki teklif belgesinde yer almaktadır.',
  },
  en: {
    subject: 'Price Proposal',
    headline: 'Your Kalem Platform price proposal is ready',
    greeting: 'Dear',
    paragraphs: [
      'Please find attached the price proposal we prepared following our meeting.',
      'We hope this will be the beginning of a successful partnership and look forward to your valuable feedback.',
      'For any questions or assistance, please contact us by phone or through our website.',
    ],
    regards: 'Kind regards,',
    team: 'The Kalem Yazılım Team',
    attachment: 'Kalem_Platform_Price_Proposal.pdf',
    attachmentDetail: 'Corporate price proposal · PDF attachment',
    legal: 'This email and its attachments are intended only for the named recipient. Proposal terms are provided in the attached document.',
  },
};

export interface QuoteEmailContent {
  subject: string;
  text: string;
  html: string;
  attachmentFilename: string;
  logo: Buffer;
  logoCid: string;
}

@Injectable()
export class QuoteEmailService {
  build(quote: Quote, lang: QuoteEmailLang): QuoteEmailContent {
    const copy = COPY[lang];
    const contact = (quote.contactName?.trim() || quote.customerName.trim());
    const safeContact = this.escape(contact);
    const safeQuoteNumber = this.escape(quote.quoteNumber);
    const subject = `Kalem Platform — ${copy.subject} ${quote.quoteNumber}`;
    const text = `${copy.greeting} ${contact},

${copy.paragraphs.join('\n\n')}

${copy.regards}
${copy.team}

Kalem Yazılım MMC
+994 12 526 22 22
info@kalemyazilim.az
www.kalemyazilim.az
Heydər Əliyev prospekti 105-N, Nərimanov, Bakı`;

    return {
      subject,
      text,
      attachmentFilename: copy.attachment,
      logoCid: 'kalem-logo@cmanage',
      logo: Buffer.from(KALEM_EMAIL_LOGO_BASE64, 'base64'),
      html: `<!doctype html><html><body style="margin:0;padding:0;background:#f2f6f7;font-family:Arial,Helvetica,sans-serif;color:#16383f">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f6f7"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="720" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:720px;background:#ffffff;border:1px solid #d9e4e6;border-radius:18px;overflow:hidden">
<tr><td style="padding:34px 38px;background:#082f35;color:#ffffff">
  <table role="presentation" width="100%"><tr><td><table role="presentation" cellspacing="0" cellpadding="0"><tr><td><img src="cid:kalem-logo@cmanage" alt="Kalem Yazılım" width="56" style="display:block;width:56px;height:auto"></td><td style="padding-left:12px;color:#ffffff"><strong style="font-size:20px">Kalem Yazılım</strong><br><span style="font-size:11px;color:#9bc9cf">KURUMSAL TEKNOLOJİ ÇÖZÜMLERİ</span></td></tr></table></td><td align="right" style="font-size:12px;color:#c4e2e5">${safeQuoteNumber}</td></tr></table>
  <h1 style="margin:30px 0 0;font-size:27px;line-height:1.2;color:#ffffff">${copy.headline}</h1>
</td></tr>
<tr><td style="padding:38px">
  <p style="margin:0 0 18px;font-size:18px;font-weight:700;line-height:1.6">${copy.greeting} ${safeContact},</p>
  ${copy.paragraphs.map((paragraph) => `<p style="margin:0 0 17px;font-size:15px;line-height:1.75">${paragraph}</p>`).join('')}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0 30px;background:#f2f6f7;border:1px solid #d9e4e6;border-radius:12px"><tr><td width="48" style="padding:15px 0 15px 16px;font-size:25px;color:#0e7a88">▣</td><td style="padding:15px"><strong style="font-size:14px">${copy.attachment}</strong><br><span style="font-size:12px;color:#607d83">${copy.attachmentDetail}</span></td></tr></table>
  <p style="margin:0 0 28px;font-size:15px;line-height:1.7">${copy.regards}<br><strong>${copy.team}</strong></p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #d9e4e6"><tr><td valign="top" style="padding-top:24px"><strong style="font-size:16px">Kalem Yazılım MMC</strong><br><span style="font-size:12px;line-height:1.6;color:#607d83">ERP, retail and corporate software solutions</span></td><td valign="top" style="padding-top:24px;font-size:12px;line-height:1.8;color:#607d83">+994 12 526 22 22<br><a href="mailto:info@kalemyazilim.az" style="color:#0e7a88">info@kalemyazilim.az</a><br><a href="https://www.kalemyazilim.az" style="color:#0e7a88">www.kalemyazilim.az</a><br>Heydər Əliyev prospekti 105-N, Nərimanov, Bakı</td></tr></table>
  <p style="margin:26px 0 0;padding-top:16px;border-top:1px solid #d9e4e6;font-size:10px;line-height:1.5;color:#82969a">${copy.legal}</p>
</td></tr></table></td></tr></table></body></html>`,
    };
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char] ?? char);
  }

}
