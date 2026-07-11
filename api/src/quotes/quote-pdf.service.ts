import { Injectable } from '@nestjs/common';
import { PdfService } from '../common/pdf.service';
import { Quote } from '../entities/quote.entity';

export type QuoteLang = 'az' | 'tr' | 'en';

type Copy = {
  documentTitle: string;
  proposal: string;
  preparedFor: string;
  preparedBy: string;
  quoteNo: string;
  date: string;
  validUntil: string;
  greeting: (name: string) => string;
  intro: string;
  solutionTitle: string;
  solutionText: string;
  benefitsTitle: string;
  benefits: string[];
  scopeTitle: string;
  scopeText: string;
  pricingTitle: string;
  pricingLead: string;
  item: string;
  qty: string;
  unitPrice: string;
  lineTotal: string;
  users: string;
  posTerminals: string;
  mobileTerminals: string;
  monthlyTotal: string;
  commercialTitle: string;
  vat: string;
  validity: string;
  billing: string;
  notes: string;
  closingTitle: string;
  closingText: string;
  confidential: string;
  page: string;
};

const I18N: Record<QuoteLang, Copy> = {
  az: {
    documentTitle: 'Korporativ Qiymət Təklifi', proposal: 'Kalem Platform Retail İdarəetmə Həlli',
    preparedFor: 'Təklif edilən', preparedBy: 'Hazırlayan', quoteNo: 'Təklif №', date: 'Tarix',
    validUntil: 'Etibarlılıq müddəti', greeting: (name) => `Hörmətli ${name},`,
    intro: 'Görüşümüz və ehtiyaclarınız əsasında hazırladığımız Kalem Platform təklifini nəzərinizə çatdırırıq. Məqsədimiz pərakəndə satış əməliyyatlarınızı vahid, təhlükəsiz və ölçülə bilən bir platformada idarə etməyinizə kömək etməkdir.',
    solutionTitle: 'Təklif olunan həll',
    solutionText: 'Kalem Platform mərkəz, mağaza, POS və mobil əməliyyatları bir araya gətirən bulud əsaslı pərakəndə satış idarəetmə platformasıdır. Modul quruluş biznesiniz böyüdükcə istifadəçi və terminal sayının çevik artırılmasına imkan verir.',
    benefitsTitle: 'Biznesinizə qazandıracaqları',
    benefits: ['Mərkəz və filialların vahid paneldən idarə edilməsi', 'Real vaxt rejimində satış və əməliyyat görünürlüğü', 'Rol əsaslı təhlükəsiz istifadəçi idarəetməsi', 'Ehtiyac artdıqca genişlənən çevik lisenziya modeli'],
    scopeTitle: 'Təklifin əhatə dairəsi',
    scopeText: 'Aşağıdakı qiymətlər aylıq proqram istifadəsi, seçilmiş istifadəçi lisenziyaları və terminal tutumları üçün hazırlanmışdır. Quraşdırma və əlavə inteqrasiya ehtiyacları ayrıca qiymətləndirilə bilər.',
    pricingTitle: 'Qiymət cədvəli', pricingLead: 'Seçilmiş lisenziya və terminal tərkibi',
    item: 'Xidmət', qty: 'Say', unitPrice: 'Vahid qiymət / ay', lineTotal: 'Aylıq cəmi',
    users: 'İstifadəçi lisenziyası', posTerminals: 'POS kassa terminalı', mobileTerminals: 'Mobil terminal',
    monthlyTotal: 'AYLIQ ÜMUMİ MƏBLƏĞ', commercialTitle: 'Kommersiya şərtləri',
    vat: 'Qiymətlərə ƏDV daxil deyil.', validity: 'Bu təklif verildiyi tarixdən etibarən 30 gün qüvvədədir.',
    billing: 'Xidmət haqqı aylıq hesablanır. Ödəniş və aktivləşdirmə şərtləri müqavilədə rəsmiləşdirilir.',
    notes: 'Əlavə qeydlər', closingTitle: 'Növbəti addım',
    closingText: 'Təklifin təsdiqindən sonra komandamız aktivləşdirmə planını və layihə təqvimini sizinlə paylaşacaq. Suallarınız üçün hər zaman bizimlə əlaqə saxlaya bilərsiniz.',
    confidential: 'MƏXFİ - Yalnız təklif edilən qurumun istifadəsi üçündür', page: 'Səhifə',
  },
  tr: {
    documentTitle: 'Kurumsal Fiyat Teklifi', proposal: 'Kalem Platform Perakende Yönetim Çözümü',
    preparedFor: 'Teklif sunulan', preparedBy: 'Hazırlayan', quoteNo: 'Teklif No', date: 'Tarih',
    validUntil: 'Geçerlilik', greeting: (name) => `Sayın ${name},`,
    intro: 'Görüşmemiz ve ihtiyaçlarınız doğrultusunda hazırladığımız Kalem Platform teklifini bilgilerinize sunarız. Amacımız perakende operasyonlarınızı tek, güvenli ve ölçeklenebilir bir platformdan yönetmenize yardımcı olmaktır.',
    solutionTitle: 'Önerilen çözüm',
    solutionText: 'Kalem Platform; merkez, mağaza, POS ve mobil operasyonları bir araya getiren bulut tabanlı perakende yönetim platformudur. Modüler yapısı, işletmeniz büyüdükçe kullanıcı ve terminal kapasitesinin esnek biçimde artırılmasını sağlar.',
    benefitsTitle: 'İşletmenize sağlayacağı değer',
    benefits: ['Merkez ve şubelerin tek panelden yönetimi', 'Satış ve operasyonlara gerçek zamanlı görünürlük', 'Rol tabanlı, güvenli kullanıcı yönetimi', 'İhtiyaca göre büyüyen esnek lisanslama modeli'],
    scopeTitle: 'Teklif kapsamı',
    scopeText: 'Aşağıdaki fiyatlar aylık yazılım kullanımı, seçilen kullanıcı lisansları ve terminal kapasiteleri için hazırlanmıştır. Kurulum ve özel entegrasyon ihtiyaçları ayrıca değerlendirilebilir.',
    pricingTitle: 'Fiyatlandırma', pricingLead: 'Seçilen lisans ve terminal bileşimi',
    item: 'Hizmet', qty: 'Adet', unitPrice: 'Birim fiyat / ay', lineTotal: 'Aylık tutar',
    users: 'Kullanıcı lisansı', posTerminals: 'POS kasa terminali', mobileTerminals: 'Mobil terminal',
    monthlyTotal: 'AYLIK TOPLAM', commercialTitle: 'Ticari koşullar', vat: 'Fiyatlara KDV dahil değildir.',
    validity: 'Bu teklif düzenlenme tarihinden itibaren 30 gün geçerlidir.',
    billing: 'Hizmet bedeli aylık olarak faturalandırılır. Ödeme ve aktivasyon koşulları sözleşmede kesinleştirilir.',
    notes: 'Ek notlar', closingTitle: 'Sonraki adım',
    closingText: 'Teklif onayından sonra ekibimiz aktivasyon planını ve proje takvimini sizinle paylaşacaktır. Sorularınız için her zaman bizimle iletişime geçebilirsiniz.',
    confidential: 'GİZLİ - Yalnızca teklif sunulan kurumun kullanımına özeldir', page: 'Sayfa',
  },
  en: {
    documentTitle: 'Corporate Price Proposal', proposal: 'Kalem Platform Retail Management Solution',
    preparedFor: 'Prepared for', preparedBy: 'Prepared by', quoteNo: 'Proposal no.', date: 'Date',
    validUntil: 'Validity', greeting: (name) => `Dear ${name},`,
    intro: 'Based on our discussion and your requirements, we are pleased to present our Kalem Platform proposal. Our goal is to help you manage retail operations through one secure and scalable platform.',
    solutionTitle: 'Proposed solution',
    solutionText: 'Kalem Platform is a cloud-based retail management platform bringing headquarters, stores, POS and mobile operations together. Its modular architecture allows user and terminal capacity to scale as your business grows.',
    benefitsTitle: 'Business value', benefits: ['Central management of headquarters and branches', 'Real-time visibility into sales and operations', 'Secure, role-based user management', 'Flexible licensing that scales with demand'],
    scopeTitle: 'Proposal scope',
    scopeText: 'The prices below cover monthly software use, selected user licenses and terminal capacity. Setup and custom integration requirements can be evaluated separately.',
    pricingTitle: 'Pricing', pricingLead: 'Selected license and terminal configuration', item: 'Service', qty: 'Qty',
    unitPrice: 'Unit price / month', lineTotal: 'Monthly total', users: 'User license',
    posTerminals: 'POS register terminal', mobileTerminals: 'Mobile terminal', monthlyTotal: 'TOTAL PER MONTH',
    commercialTitle: 'Commercial terms', vat: 'Prices exclude VAT.',
    validity: 'This proposal is valid for 30 days from its issue date.',
    billing: 'Services are billed monthly. Payment and activation terms will be finalized in the agreement.',
    notes: 'Additional notes', closingTitle: 'Next step',
    closingText: 'Following approval, our team will share the activation plan and project timeline. Please contact us at any time if you have questions.',
    confidential: 'CONFIDENTIAL - Intended solely for the recipient', page: 'Page',
  },
};

const LOCALE: Record<QuoteLang, string> = { az: 'az-AZ', tr: 'tr-TR', en: 'en-US' };

@Injectable()
export class QuotePdfService {
  constructor(private readonly pdf: PdfService) {}

  renderHtml(quote: Quote, lang: QuoteLang): string {
    const t = I18N[lang];
    const created = new Date(quote.createdAt);
    const validUntil = new Date(created);
    validUntil.setDate(validUntil.getDate() + 30);
    const formatDate = (date: Date) => date.toLocaleDateString(LOCALE[lang]);
    const money = (value: string | number) => `${Number(value).toLocaleString(LOCALE[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${this.escape(quote.currency)}`;
    const lineTotal = (qty: number, unit: string) => money(qty * Number(unit));
    const rows = [
      { label: t.users, qty: quote.seats, unit: quote.pricePerUser },
      { label: t.posTerminals, qty: quote.posTerminals, unit: quote.pricePerPosTerminal },
      ...(quote.mobileTerminals > 0 ? [{ label: t.mobileTerminals, qty: quote.mobileTerminals, unit: quote.pricePerMobileTerminal }] : []),
    ];
    const customer = this.escape(quote.customerName);
    const proposalNo = `KP-${created.getFullYear()}-${quote.id.slice(0, 8).toUpperCase()}`;

    const footer = (page: number) => `<footer><span>${t.confidential}</span><span>kalemyazilim.az</span><span>${t.page} ${page} / 3</span></footer>`;
    const brand = `<div class="brand"><img src="http://website/assets/kalem-logo.png" alt="Kalem"><div><b>KALEM</b><small>YAZILIM</small></div></div>`;

    return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #172033; font-family: Arial, 'Noto Sans', sans-serif; background: white; }
      .page { width: 210mm; height: 297mm; padding: 18mm 18mm 15mm; position: relative; overflow: hidden; page-break-after: always; }
      .page:last-child { page-break-after: auto; }
      .accent { position: absolute; inset: 0 0 auto 0; height: 8mm; background: linear-gradient(90deg,#02a9d9 0 64%,#007ca9 64%); }
      .brand { display: flex; align-items: center; gap: 3mm; color: #057fa8; }
      .brand img { width: 23mm; height: 23mm; object-fit: contain; }
      .brand b { display: block; font-size: 19pt; letter-spacing: 1.5px; line-height: .85; }
      .brand small { font-size: 7.5pt; letter-spacing: 4px; color: #34465c; }
      .topline { display: flex; justify-content: space-between; align-items: center; padding-top: 5mm; }
      .doc-type { font-size: 9pt; text-transform: uppercase; letter-spacing: 1.6px; color: #637184; font-weight: 700; }
      .cover { background: linear-gradient(150deg,#fff 0 62%,#eaf8fc 62% 100%); }
      .cover:after { content:''; position:absolute; width:110mm; height:110mm; right:-45mm; bottom:-42mm; border:22mm solid rgba(2,169,217,.10); border-radius:50%; }
      .cover-main { margin-top: 37mm; width: 150mm; }
      .eyebrow { color:#009dcc; font-size:10pt; letter-spacing:2px; font-weight:700; text-transform:uppercase; }
      h1 { font-size: 34pt; line-height: 1.08; margin: 5mm 0 5mm; color:#142a43; letter-spacing:-1px; }
      .subtitle { font-size: 16pt; line-height: 1.4; color:#526377; margin:0; }
      .cover-card { margin-top: 24mm; border-left: 1.6mm solid #02a9d9; padding: 4mm 0 4mm 6mm; display:grid; grid-template-columns: 1.4fr 1fr; gap: 7mm; width: 160mm; background:rgba(255,255,255,.72); }
      .label { font-size:7.5pt; color:#718096; text-transform:uppercase; letter-spacing:1px; font-weight:700; margin-bottom:1.4mm; }
      .value { font-size:12pt; color:#172033; font-weight:700; }
      .cover-meta { margin-top: 12mm; display:grid; grid-template-columns:repeat(3,1fr); gap:5mm; width:160mm; }
      .cover-meta .value { font-size:10pt; }
      header { display:flex; justify-content:space-between; align-items:center; border-bottom:.4mm solid #dce6ed; padding:4mm 0 5mm; }
      header .brand img { width:15mm; height:15mm; } header .brand b { font-size:14pt; } header .brand small { font-size:5.5pt; }
      .section-no { color:#02a9d9; font-weight:700; font-size:9pt; letter-spacing:1px; }
      main { padding-top: 12mm; }
      h2 { font-size:24pt; margin:0 0 8mm; color:#142a43; }
      h3 { font-size:13pt; color:#087fa8; margin:8mm 0 3mm; }
      p { font-size:10.5pt; line-height:1.62; margin:0 0 4mm; color:#334155; }
      .greeting { font-size:15pt; font-weight:700; color:#142a43; margin-bottom:6mm; }
      .feature-grid { display:grid; grid-template-columns:1fr 1fr; gap:4mm; margin-top:5mm; }
      .feature { background:#f2f9fc; border-top:1mm solid #02a9d9; padding:5mm; min-height:25mm; font-size:9.5pt; line-height:1.45; color:#334155; }
      .scope { margin-top:8mm; padding:6mm; border: .4mm solid #d7e6ed; border-radius:2mm; }
      .scope h3 { margin-top:0; }
      table { width:100%; border-collapse:collapse; margin-top:7mm; font-size:9.5pt; }
      thead th { background:#142a43; color:white; padding:4mm 3mm; text-align:left; font-size:8pt; text-transform:uppercase; letter-spacing:.4px; }
      td { padding:4mm 3mm; border-bottom:.35mm solid #dce6ed; }
      tbody tr:nth-child(even) td { background:#f5fafc; }
      .num { text-align:right; white-space:nowrap; }
      .total td { background:#e6f7fc !important; font-weight:800; font-size:11pt; color:#087fa8; border-top:.8mm solid #02a9d9; }
      .terms { display:grid; grid-template-columns:1fr 1fr 1fr; gap:4mm; margin-top:9mm; }
      .term { background:#f6f8fa; padding:5mm; min-height:31mm; border-radius:2mm; }
      .term b { display:block; color:#087fa8; font-size:9pt; margin-bottom:2mm; }
      .term span { font-size:8.5pt; line-height:1.45; color:#526377; }
      .notes { margin-top:7mm; border-left:1mm solid #02a9d9; padding:2mm 0 2mm 4mm; font-size:9pt; line-height:1.5; white-space:pre-wrap; color:#526377; }
      .closing { margin-top:9mm; padding:6mm; background:#142a43; color:white; border-radius:2mm; }
      .closing h3 { color:#62d5f3; margin:0 0 2mm; }.closing p { color:white; font-size:9.5pt; margin:0; }
      footer { position:absolute; left:18mm; right:18mm; bottom:7mm; border-top:.35mm solid #cbd8df; padding-top:3mm; display:flex; justify-content:space-between; font-size:6.8pt; color:#7a8796; letter-spacing:.2px; z-index:2; }
    </style></head><body>
      <section class="page cover"><div class="accent"></div><div class="topline">${brand}<div class="doc-type">${t.documentTitle}</div></div>
        <div class="cover-main"><div class="eyebrow">${t.documentTitle}</div><h1>${t.proposal}</h1><p class="subtitle">${customer}</p></div>
        <div class="cover-card"><div><div class="label">${t.preparedFor}</div><div class="value">${customer}</div>${quote.contactEmail ? `<div style="margin-top:2mm;font-size:9pt;color:#526377">${this.escape(quote.contactEmail)}</div>` : ''}</div><div><div class="label">${t.preparedBy}</div><div class="value">Kalem Yazılım</div></div></div>
        <div class="cover-meta"><div><div class="label">${t.quoteNo}</div><div class="value">${proposalNo}</div></div><div><div class="label">${t.date}</div><div class="value">${formatDate(created)}</div></div><div><div class="label">${t.validUntil}</div><div class="value">${formatDate(validUntil)}</div></div></div>${footer(1)}
      </section>
      <section class="page"><div class="accent"></div><header>${brand}<div class="section-no">01 / ${t.solutionTitle.toUpperCase()}</div></header><main>
        <div class="greeting">${t.greeting(customer)}</div><p>${t.intro}</p><h3>${t.solutionTitle}</h3><p>${t.solutionText}</p>
        <h3>${t.benefitsTitle}</h3><div class="feature-grid">${t.benefits.map((benefit, i) => `<div class="feature"><b style="color:#02a9d9">0${i + 1}</b><br>${benefit}</div>`).join('')}</div>
        <div class="scope"><h3>${t.scopeTitle}</h3><p>${t.scopeText}</p></div></main>${footer(2)}
      </section>
      <section class="page"><div class="accent"></div><header>${brand}<div class="section-no">02 / ${t.pricingTitle.toUpperCase()}</div></header><main><h2>${t.pricingTitle}</h2><p>${t.pricingLead}</p>
        <table><thead><tr><th>${t.item}</th><th class="num">${t.qty}</th><th class="num">${t.unitPrice}</th><th class="num">${t.lineTotal}</th></tr></thead><tbody>
          ${rows.map((row) => `<tr><td><b>${row.label}</b></td><td class="num">${row.qty}</td><td class="num">${money(row.unit)}</td><td class="num">${lineTotal(row.qty, row.unit)}</td></tr>`).join('')}
          <tr class="total"><td colspan="3">${t.monthlyTotal}</td><td class="num">${money(quote.monthlyTotal)}</td></tr></tbody></table>
        <h3>${t.commercialTitle}</h3><div class="terms"><div class="term"><b>01</b><span>${t.vat}</span></div><div class="term"><b>02</b><span>${t.validity}</span></div><div class="term"><b>03</b><span>${t.billing}</span></div></div>
        ${quote.notes ? `<div class="notes"><b>${t.notes}</b><br>${this.escape(quote.notes)}</div>` : ''}
        <div class="closing"><h3>${t.closingTitle}</h3><p>${t.closingText}</p></div></main>${footer(3)}
      </section>
    </body></html>`;
  }

  async renderPdf(quote: Quote, lang: QuoteLang): Promise<Buffer> {
    return this.pdf.htmlToPdf(this.renderHtml(quote, lang));
  }

  private escape(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
}
