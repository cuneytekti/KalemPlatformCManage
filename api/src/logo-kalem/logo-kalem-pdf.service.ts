import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PdfService } from '../common/pdf.service';
import { KALEM_EMAIL_LOGO_BASE64 } from '../quotes/quote-email-logo';
import type { LogoKalemDetail } from './logo-kalem.service';

type Language = 'tr' | 'az' | 'en';

const copy = {
  tr: {
    offer: 'Kurumsal Çözüm Teklifi', executive: 'Yönetici Özeti', about: 'Kalem Hakkında', solution: 'Çözüm Yaklaşımımız',
    pricing: 'Ürün ve Hizmetler', summary: 'Proje ve Yatırım Özeti', commercial: 'Ticari Şartlar', references: 'Referanslar',
    certificates: 'Sertifikalar', closing: 'Birlikte değer üretelim', preparedFor: 'Hazırlanan kurum', contact: 'Muhatap', date: 'Teklif tarihi',
    meeting: 'Görüşme tarihi', product: 'Ürün / Hizmet', qty: 'Miktar', unit: 'Birim', price: 'Birim Fiyat', discount: 'İndirim', total: 'Toplam',
    listTotal: 'Toplam Liste Fiyatı', discountRate: 'İndirim Oranı', discountAmount: 'İndirim Tutarı', netTotal: 'Net Toplam',
    main: 'Ana Proje', maintenance: 'Bakım', lem: 'Yıllık LEM', tax: 'Vergiler', duration: 'Proje Süresi', payment: 'Ödeme', validity: 'Geçerlilik',
    delivery: 'Teslimat', travel: 'Seyahat ve Konaklama', notes: 'Notlar', confidential: 'GİZLİ • Yalnız belirtilen kurumun değerlendirmesi içindir',
    subject: 'Konu', sender: 'Hazırlayan', introFallback: 'İş hedeflerinizi destekleyecek, sürdürülebilir ve ölçeklenebilir bir Logo–Kalem çözüm modeli sunuyoruz.',
    scopeFallback: 'Lisanslama, devreye alma, eğitim, danışmanlık ve satış sonrası hizmetler tek bir proje yaklaşımı içinde planlanmıştır.',
    teamFallback: 'Proje ekibi; analiz, uygulama danışmanlığı, teknik destek ve proje yönetimi yetkinliklerinden oluşur.',
    aboutBody: 'Kalem Yazılım; kurumların perakende, finans, operasyon ve yönetim süreçlerini güvenilir teknolojiyle birleştiren çözüm ortağıdır. Deneyimli ekibimiz, Logo ürün ailesi ile KL-Retail yetkinliklerini iş gereksinimlerinize göre bütünleştirir.',
    values: ['İhtiyaca uygun çözüm mimarisi', 'Ölçeklenebilir lisans ve hizmet modeli', 'Yerel uzmanlık ve erişilebilir destek', 'Ölçülebilir proje ve süreç yönetimi'],
    greeting: 'Sayın', mailBody: 'Görüşmemize istinaden hazırladığımız Logo–Kalem fiyat teklifini ekte bilgilerinize sunarız. Hayırlara vesile olmasını temenni eder, değerli görüşlerinizi bekleriz.',
    mailHelp: 'Her türlü soru ve talebiniz için telefon numaramızdan veya web sitemiz üzerinden bize ulaşabilirsiniz.', regards: 'Saygılarımızla',
  },
  az: {
    offer: 'Korporativ Həll Təklifi', executive: 'İcraçı Xülasə', about: 'Kalem Haqqında', solution: 'Həll Yanaşmamız',
    pricing: 'Məhsul və Xidmətlər', summary: 'Layihə və İnvestisiya Xülasəsi', commercial: 'Kommersiya Şərtləri', references: 'Referanslar',
    certificates: 'Sertifikatlar', closing: 'Birlikdə dəyər yaradaq', preparedFor: 'Təklif edilən qurum', contact: 'Əlaqədar şəxs', date: 'Təklif tarixi',
    meeting: 'Görüş tarixi', product: 'Məhsul / Xidmət', qty: 'Miqdar', unit: 'Vahid', price: 'Vahid Qiymət', discount: 'Endirim', total: 'Cəm',
    listTotal: 'Ümumi Siyahı Qiyməti', discountRate: 'Endirim Faizi', discountAmount: 'Endirim Məbləği', netTotal: 'Xalis Cəm',
    main: 'Əsas Layihə', maintenance: 'Texniki Xidmət', lem: 'İllik LEM', tax: 'Vergilər', duration: 'Layihə Müddəti', payment: 'Ödəniş', validity: 'Etibarlılıq',
    delivery: 'Təhvil', travel: 'Səfər və Yaşayış', notes: 'Qeydlər', confidential: 'MƏXFİ • Yalnız göstərilən qurumun qiymətləndirilməsi üçündür',
    subject: 'Mövzu', sender: 'Hazırlayan', introFallback: 'Biznes hədəflərinizi dəstəkləyən davamlı və miqyaslana bilən Logo–Kalem həll modeli təqdim edirik.',
    scopeFallback: 'Lisenziyalaşdırma, tətbiq, təlim, məsləhət və satışdan sonrakı xidmətlər vahid layihə yanaşması ilə planlaşdırılıb.',
    teamFallback: 'Layihə komandası analiz, tətbiq məsləhəti, texniki dəstək və layihə idarəetməsi üzrə mütəxəssislərdən ibarətdir.',
    aboutBody: 'Kalem Yazılım pərakəndə, maliyyə, əməliyyat və idarəetmə proseslərini etibarlı texnologiya ilə birləşdirən həll tərəfdaşıdır. Təcrübəli komandamız Logo məhsul ailəsi və KL-Retail imkanlarını biznes ehtiyaclarınıza uyğun inteqrasiya edir.',
    values: ['Ehtiyaca uyğun həll arxitekturası', 'Miqyaslana bilən lisenziya və xidmət modeli', 'Yerli təcrübə və əlçatan dəstək', 'Ölçülə bilən layihə və proses idarəetməsi'],
    greeting: 'Hörmətli', mailBody: 'Görüşümüzə əsasən hazırladığımız Logo–Kalem qiymət təklifini əlavə olaraq təqdim edirik. Xeyirli olmasını arzulayır, dəyərli fikirlərinizi gözləyirik.',
    mailHelp: 'Bütün sual və müraciətləriniz üçün telefon nömrəmizdən və ya veb saytımızdan bizimlə əlaqə saxlaya bilərsiniz.', regards: 'Hörmətlə',
  },
  en: {
    offer: 'Corporate Solution Proposal', executive: 'Executive Summary', about: 'About Kalem', solution: 'Our Solution Approach',
    pricing: 'Products and Services', summary: 'Project and Investment Summary', commercial: 'Commercial Terms', references: 'References',
    certificates: 'Certificates', closing: 'Let us create value together', preparedFor: 'Prepared for', contact: 'Contact', date: 'Proposal date',
    meeting: 'Meeting date', product: 'Product / Service', qty: 'Quantity', unit: 'Unit', price: 'Unit Price', discount: 'Discount', total: 'Total',
    listTotal: 'Total List Price', discountRate: 'Discount Rate', discountAmount: 'Discount Amount', netTotal: 'Net Total',
    main: 'Main Project', maintenance: 'Maintenance', lem: 'Annual LEM', tax: 'Taxes', duration: 'Project Duration', payment: 'Payment', validity: 'Validity',
    delivery: 'Delivery', travel: 'Travel and Accommodation', notes: 'Notes', confidential: 'CONFIDENTIAL • Intended solely for the named organisation',
    subject: 'Subject', sender: 'Prepared by', introFallback: 'We offer a sustainable and scalable Logo–Kalem solution model designed to support your business objectives.',
    scopeFallback: 'Licensing, implementation, training, consultancy and after-sales services are planned within one coordinated project approach.',
    teamFallback: 'The project team combines business analysis, implementation consultancy, technical support and project management expertise.',
    aboutBody: 'Kalem Yazılım is a solution partner that connects retail, finance, operations and management processes with reliable technology. Our experienced team integrates the Logo product family and KL-Retail capabilities around your business needs.',
    values: ['Needs-led solution architecture', 'Scalable licensing and service model', 'Local expertise and accessible support', 'Measurable project and process management'],
    greeting: 'Dear', mailBody: 'Further to our meeting, please find attached our Logo–Kalem commercial proposal. We hope it will lead to a successful collaboration and look forward to your valued feedback.',
    mailHelp: 'For any questions or requests, you can contact us by telephone or through our website.', regards: 'Kind regards',
  },
} as const;

@Injectable()
export class LogoKalemPdfService {
  constructor(private readonly pdf: PdfService) {}

  render(detail: LogoKalemDetail): Promise<Buffer> {
    return this.pdf.htmlToPdf(this.html(detail));
  }

  html(detail: LogoKalemDetail): string {
    const lang: Language = detail.revision.language;
    const t = copy[lang];
    const number = this.number(detail);
    const pages: string[] = [];
    pages.push(this.page(detail, t.offer, `<div class="cover-mark"></div><div class="cover-content"><span class="eyebrow">LOGO × KALEM</span><h1>${this.e(detail.revision.projectTitle)}</h1><p class="lead">${this.e(detail.revision.subject || t.offer)}</p><div class="cover-grid"><div><small>${t.preparedFor}</small><strong>${this.e(detail.quote.customerName)}</strong></div><div><small>${t.contact}</small><strong>${this.e(detail.quote.contactName || '—')}</strong></div><div><small>${t.date}</small><strong>${this.date(detail.revision.quoteDate, lang)}</strong></div><div><small>${t.sender}</small><strong>${this.e(detail.revision.senderName)}</strong></div></div></div>`, number, true));
    pages.push(this.page(detail, t.executive, `<div class="intro-grid"><div class="statement">${this.paragraphs(detail.revision.introduction || t.introFallback)}</div><div class="meta-card"><span>${t.subject}</span><strong>${this.e(detail.revision.subject || detail.revision.projectTitle)}</strong>${detail.revision.meetingDate ? `<span>${t.meeting}</span><strong>${this.date(detail.revision.meetingDate, lang)}</strong>` : ''}</div></div><div class="section-block"><h2>${t.solution}</h2>${this.paragraphs(detail.revision.projectScope || t.scopeFallback)}</div><div class="callout">${this.paragraphs(detail.revision.projectTeam || t.teamFallback)}</div>`, number));
    pages.push(this.page(detail, t.about, `<p class="large-copy">${this.e(t.aboutBody)}</p><div class="value-grid">${t.values.map((v, i) => `<div><b>0${i + 1}</b><span>${this.e(v)}</span></div>`).join('')}</div><div class="brand-band"><strong>Logo + KL-Retail</strong><span>ERP • Retail • Finance • Operations • Analytics</span></div>`, number));

    const populated = detail.sections.filter((section) => section.lines.length);
    if (!populated.length) pages.push(this.page(detail, t.pricing, '<div class="empty">—</div>', number));
    populated.forEach((section) => {
      const chunks = this.chunk(section.lines, 9);
      chunks.forEach((lines, index) => pages.push(this.page(detail, `${section.title}${index ? ` (${index + 1})` : ''}`, this.table(lines, section.currency, lang, t) + (index === chunks.length - 1 ? this.sectionSummary(section, lang, t) : ''), number)));
    });

    const adjustmentTitle = lang === 'az' ? 'Qiymət Tənzimləmələri' : lang === 'en' ? 'Price Adjustments' : 'Fiyat Ayarlamaları';
    pages.push(this.page(detail, t.summary, `<div class="totals"><div><span>${t.main}</span><strong>${this.amount(detail.revision.mainTotal, this.currency(detail, ['MAIN', 'SERVICE']), lang)}</strong></div><div><span>${t.maintenance}</span><strong>${this.amount(detail.revision.maintenanceTotal, this.currency(detail, ['MAINTENANCE']), lang)}</strong></div><div><span>${t.lem}</span><strong>${this.amount(detail.revision.lemTotal, this.currency(detail, ['LEM']), lang)}</strong></div><div class="accent"><span>${t.tax}</span><strong>${this.amount(detail.revision.taxTotal, this.currency(detail, ['MAIN', 'SERVICE']), lang)}</strong></div></div>${detail.adjustments.length ? `<h2>${this.e(adjustmentTitle)}</h2><div class="adjustments">${detail.adjustments.map((a) => `<div><span>${this.e(a.label)}</span><strong>${this.amount(a.amount, this.currency(detail, [a.target]), lang)}</strong></div>`).join('')}</div>` : ''}`, number));
    pages.push(this.page(detail, t.commercial, `<div class="terms">${this.term(t.duration, detail.revision.projectDuration)}${this.term(t.payment, detail.revision.paymentTerms)}${this.term(t.validity, detail.revision.validityTerms)}${this.term(t.delivery, detail.revision.deliveryTerms)}${this.term(t.travel, detail.revision.travelTerms)}${this.term(t.notes, detail.revision.notes)}</div>`, number));
    const appendixCount = (detail.revision.includeReferences ? 2 : 0) + (detail.revision.includeCertificates ? 1 : 0);
    const journeyTitles = lang === 'az' ? ['Təhlil', 'Tətbiq', 'Canlı İstifadə', 'Dəstək'] : lang === 'en' ? ['Analysis', 'Implementation', 'Go-live', 'Support'] : ['Analiz', 'Uygulama', 'Canlı Kullanım', 'Destek'];
    if (pages.length + appendixCount < 8) pages.push(this.page(detail, t.solution, `<div class="journey"><div><b>01</b><h3>${journeyTitles[0]}</h3><p>${this.e(detail.revision.projectScope || t.scopeFallback)}</p></div><div><b>02</b><h3>${journeyTitles[1]}</h3><p>${this.e(detail.revision.projectTeam || t.teamFallback)}</p></div><div><b>03</b><h3>${journeyTitles[2]}</h3><p>${this.e(detail.revision.deliveryTerms || t.delivery)}</p></div><div><b>04</b><h3>${journeyTitles[3]}</h3><p>${this.e(detail.revision.projectDuration || t.duration)}</p></div></div>`, number));
    if (pages.length + appendixCount < 8) pages.push(this.page(detail, t.closing, `<div class="closing"><img src="data:image/png;base64,${KALEM_EMAIL_LOGO_BASE64}"><h2>${this.e(t.closing)}</h2><p>Kalem Yazılım MMC</p><p>+994 12 526 22 22 • info@kalemyazilim.az</p><p>www.kalemyazilim.az</p></div>`, number));
    const referenceNote = lang === 'az' ? 'Kalem korporativ referans arxivindən hazırlanmışdır.' : lang === 'en' ? 'Compiled from the Kalem corporate reference archive.' : 'Kalem kurumsal referans arşivinden derlenmiştir.';
    const certificateNote = lang === 'az' ? 'Sənədlərin etibarlılığı və aktual nüsxələri tələb əsasında ayrıca yoxlanılır.' : lang === 'en' ? 'Validity and current copies are verified separately upon request.' : 'Belge geçerlilikleri ve güncel kopyaları talep üzerine ayrıca doğrulanır.';
    if (detail.revision.includeReferences) {
      pages.push(this.page(detail, t.references, `<img class="appendix-image" src="data:image/jpeg;base64,${this.asset('references-local.jpg')}"><p class="source-note">${this.e(referenceNote)}</p>`, number));
      pages.push(this.page(detail, `${t.references} • International`, `<img class="appendix-image" src="data:image/jpeg;base64,${this.asset('references-international.jpg')}"><p class="source-note">${this.e(referenceNote)}</p>`, number));
    }
    if (detail.revision.includeCertificates) pages.push(this.page(detail, t.certificates, `<img class="appendix-image certificates" src="data:image/jpeg;base64,${this.asset('certificates.jpg')}"><p class="source-note">${this.e(certificateNote)}</p>`, number));
    const numbered = pages.map((page, index) => page.replace('__PAGE__', `${index + 1} / ${pages.length}`));
    return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${this.css()}${this.printOverrides()}</style></head><body>${numbered.join('')}</body></html>`;
  }

  email(detail: LogoKalemDetail): { subject: string; text: string; html: string } {
    const t = copy[detail.revision.language];
    const name = detail.quote.contactName || detail.quote.customerName;
    const subject = `${this.number(detail)} • ${detail.revision.projectTitle}`;
    const text = `${t.greeting} ${name},\n\n${t.mailBody}\n\n${t.mailHelp}\n\n${t.regards},\n${detail.revision.senderName}\nKalem Yazılım MMC\n+994 12 526 22 22\ninfo@kalemyazilim.az\nwww.kalemyazilim.az`;
    const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f5;padding:28px;font-family:Arial,sans-serif;color:#13263b"><tr><td align="center"><table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border-radius:16px;overflow:hidden"><tr><td style="background:#0d2944;padding:26px 34px"><img src="cid:kalem-logo" width="55" alt="Kalem"><span style="float:right;color:#66d6cf;font-size:12px">${this.e(this.number(detail))}</span></td></tr><tr><td style="padding:38px 34px"><h1 style="font-size:24px;margin:0 0 24px">${this.e(t.greeting)} ${this.e(name)},</h1><p style="font-size:16px;line-height:1.7">${this.e(t.mailBody)}</p><p style="font-size:16px;line-height:1.7">${this.e(t.mailHelp)}</p></td></tr><tr><td style="border-top:4px solid #1aa7a1;padding:24px 34px"><b>${this.e(detail.revision.senderName)}</b><br><span style="color:#536579">Kalem Yazılım MMC<br>+994 12 526 22 22 • info@kalemyazilim.az<br>www.kalemyazilim.az<br>Heydər Əliyev prospekti 105-N, Nərimanov, Bakı</span></td></tr></table></td></tr></table>`;
    return { subject, text, html };
  }

  private page(detail: LogoKalemDetail, title: string, body: string, number: string, cover = false): string {
    return `<section class="page${cover ? ' cover' : ''}"><header><img src="data:image/png;base64,${KALEM_EMAIL_LOGO_BASE64}"><span>LOGO–KALEM</span></header><main>${cover ? '' : `<div class="title"><div class="title-meta"><img src="data:image/png;base64,${KALEM_EMAIL_LOGO_BASE64}"><span>${this.e(number)}</span></div><h1>${this.e(title)}</h1></div>`}${body}</main><footer><span>${this.e(copy[detail.revision.language].confidential)}</span><span>${this.e(number)} • __PAGE__</span></footer></section>`;
  }
  private table(lines: LogoKalemDetail['sections'][number]['lines'], currency: string, lang: Language, t: typeof copy[Language]): string { return `<table><thead><tr><th>${t.product}</th><th>${t.qty}</th><th>${t.unit}</th><th>${t.price}</th><th>${t.discount}</th><th>${t.total}</th></tr></thead><tbody>${lines.map((l) => `<tr><td><strong>${this.e(l.name)}</strong>${l.description ? `<small>${this.e(l.description)}</small>` : ''}${l.location ? `<em>${this.e(l.location)}</em>` : ''}</td><td>${this.e(l.quantity)}</td><td>${this.e(l.unit)}</td><td>${this.amount(l.unitPrice, currency, lang)}</td><td><strong class="discount-rate">${this.percent(this.lineDiscountRate(l), lang)}</strong><small>${this.amount(l.discountTotal, currency, lang)}</small></td><td><strong>${this.amount(l.netTotal, currency, lang)}</strong></td></tr>`).join('')}</tbody></table>`; }
  private sectionSummary(section: LogoKalemDetail['sections'][number], lang: Language, t: typeof copy[Language]): string {
    const rate = this.effectiveRate(section.discountTotal, section.subtotal);
    return `<div class="section-summary"><div><span>${t.listTotal}</span><strong>${this.amount(section.subtotal, section.currency, lang)}</strong></div><div><span>${t.discountRate}</span><strong>${this.percent(rate, lang)}</strong></div><div><span>${t.discountAmount}</span><strong>${this.amount(section.discountTotal, section.currency, lang)}</strong></div><div class="accent"><span>${t.netTotal}</span><strong>${this.amount(section.netTotal, section.currency, lang)}</strong></div></div>`;
  }
  private lineDiscountRate(line: LogoKalemDetail['sections'][number]['lines'][number]): number {
    return line.discountType === 'PERCENT' ? Number(line.discountValue || 0) : this.effectiveRate(line.discountTotal, line.grossTotal);
  }
  private effectiveRate(discount: string, gross: string): number { const base = Number(gross || 0); return base > 0 ? Number(discount || 0) / base * 100 : 0; }
  private term(label: string, value?: string) { return value ? `<div><span>${this.e(label)}</span>${this.paragraphs(value)}</div>` : ''; }
  private paragraphs(value: string) { return value.split(/\n+/).filter(Boolean).map((p) => `<p>${this.e(p)}</p>`).join(''); }
  private currency(detail: LogoKalemDetail, types: string[]) { return detail.sections.find((s) => types.includes(s.type))?.currency ?? 'USD'; }
  private amount(value: string, currency: string, lang: Language) { return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0)) + ` ${this.e(currency)}`; }
  private percent(value: number, lang: Language) { return new Intl.NumberFormat(lang === 'az' ? 'az-AZ' : lang === 'en' ? 'en-US' : 'tr-TR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100); }
  private date(value: string, lang: Language) { const date = new Date(`${value}T00:00:00Z`); return Number.isNaN(date.getTime()) ? this.e(value) : new Intl.DateTimeFormat(lang === 'az' ? 'az-AZ' : lang === 'en' ? 'en-GB' : 'tr-TR').format(date); }
  private number(detail: LogoKalemDetail) { return `${detail.quote.baseNumber}-R${String(detail.revision.revisionNumber).padStart(2, '0')}`; }
  private chunk<T>(items: T[], size: number) { return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size)); }
  private e(value: unknown) { return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!); }
  private asset(filename: string) { return readFileSync(join(__dirname, 'assets', filename)).toString('base64'); }
  private printOverrides() { return `.page{height:297mm;break-before:page;page-break-before:always;break-after:auto;page-break-after:auto;break-inside:avoid;page-break-inside:avoid}.page:first-child{break-before:auto;page-break-before:auto}.page:not(.cover)>header{visibility:hidden}.title-meta{display:flex;align-items:center;gap:8px}.title-meta img{width:8mm;height:8mm;object-fit:contain}.title-meta span{font-size:9px;color:#149b97;letter-spacing:2px;font-weight:700}.journey{display:grid;grid-template-columns:1fr 1fr;gap:15px}.journey>div{padding:20px;border-radius:10px;background:#f3f7f8;min-height:160px}.journey b{color:#149b97;font-size:25px}.journey p{font-size:12px;line-height:1.5;color:#536579}.closing{text-align:center;padding-top:25mm}.closing img{width:28mm}.closing h2{font-size:32px;margin:25px}.closing p{color:#536579}table{table-layout:fixed}th:first-child,td:first-child{width:37%;word-break:break-word}th:not(:first-child),td:not(:first-child){word-break:break-word}`; }
  private css() { return `@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#dbe4e8;font-family:Arial,sans-serif;color:#172b40}.page{width:210mm;height:297mm;background:#fff;page-break-after:always;position:relative;overflow:hidden;padding:18mm 17mm 15mm}.page:last-child{page-break-after:auto}header{height:12mm;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #dce6e8;color:#64808b;font-size:9px;letter-spacing:2px}header img{width:13mm;height:13mm;object-fit:contain}main{padding-top:12mm}.title>span,.eyebrow{font-size:9px;color:#149b97;letter-spacing:2px;font-weight:700}.title h1{font-size:28px;margin:5px 0 18px;color:#102c47}.cover{background:#102c47;color:#fff}.cover header{border-color:#31516b;color:#87d7d3}.cover footer{color:#9bb0bf;border-color:#31516b}.cover-content{margin-top:32mm;width:88%}.cover h1{font-size:44px;line-height:1.08;color:#fff;margin:12px 0}.lead{font-size:19px;color:#b7d0db}.cover-mark{position:absolute;width:105mm;height:105mm;border:25mm solid #158f8d;border-radius:50%;right:-45mm;top:55mm;opacity:.35}.cover-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:38mm}.cover-grid div{border-top:1px solid #456177;padding-top:10px}.cover-grid small{display:block;color:#84a2b2;font-size:9px;text-transform:uppercase;letter-spacing:1px}.cover-grid strong{display:block;margin-top:6px;font-size:14px}.intro-grid{display:grid;grid-template-columns:1.6fr 1fr;gap:25px}.statement{font-size:18px;line-height:1.55}.meta-card,.callout{background:#edf6f5;border-left:4px solid #149b97;padding:18px}.meta-card span{display:block;font-size:9px;text-transform:uppercase;color:#64808b;margin:9px 0 3px}.meta-card strong{font-size:13px}.section-block{margin-top:25px}.section-block h2,h2{color:#102c47}.callout{margin-top:22px}.large-copy{font-size:19px;line-height:1.6}.value-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:28px}.value-grid div{border:1px solid #dce6e8;border-radius:9px;padding:18px;min-height:82px}.value-grid b{color:#149b97;margin-right:12px}.brand-band{margin-top:35px;background:#102c47;color:#fff;padding:24px;display:flex;justify-content:space-between}.brand-band span{color:#89d8d4}table{width:100%;border-collapse:collapse;font-size:9px}th{text-align:left;background:#102c47;color:#fff;padding:9px 7px}td{padding:9px 7px;border-bottom:1px solid #e3eaec;vertical-align:top}td small,td em{display:block;color:#667b88;margin-top:3px;font-size:8px}td em{color:#149b97}.discount-rate{display:block;color:#102c47}.section-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:12px}.section-summary>div{min-height:55px;padding:10px;background:#edf6f5;border:1px solid #dce6e8;border-radius:7px}.section-summary span,.section-summary strong{display:block}.section-summary span{min-height:18px;color:#64808b;font-size:7px;font-weight:700;letter-spacing:.4px;text-transform:uppercase}.section-summary strong{margin-top:4px;font-size:10px}.section-summary .accent{color:#fff;background:#149b97;border-color:#149b97}.section-summary .accent span{color:#dff8f6}.totals{display:grid;grid-template-columns:1fr 1fr;gap:12px}.totals>div{padding:21px;background:#f3f7f8;border-radius:9px}.totals span,.totals strong{display:block}.totals strong{font-size:19px;margin-top:8px}.totals .accent{background:#149b97;color:#fff}.adjustments>div{display:flex;justify-content:space-between;border-bottom:1px solid #e1e8ea;padding:10px}.terms{display:grid;grid-template-columns:1fr 1fr;gap:12px}.terms>div{border:1px solid #dce6e8;padding:16px;border-radius:8px}.terms span{font-size:10px;color:#149b97;font-weight:700;text-transform:uppercase}.terms p{font-size:11px;line-height:1.5}.appendix-image{display:block;width:100%;height:195mm;object-fit:contain;object-position:center top}.appendix-image.certificates{height:192mm}.source-note{margin:2mm 0 0;color:#758a95;font-size:8px;text-align:center}.muted{color:#758a95;font-size:10px;margin-top:20px}.empty{height:150mm;display:grid;place-items:center;color:#91a4ad}footer{position:absolute;left:17mm;right:17mm;bottom:8mm;padding-top:4mm;border-top:1px solid #dce6e8;display:flex;justify-content:space-between;color:#80939c;font-size:7px}`; }
}
