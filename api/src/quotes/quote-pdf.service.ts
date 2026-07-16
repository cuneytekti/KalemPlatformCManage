import { Injectable } from '@nestjs/common';
import { PdfService } from '../common/pdf.service';
import { Quote, QuoteDiscountType } from '../entities/quote.entity';
import { DEFAULT_PAYMENT_TERMS, DEFAULT_PROJECT_DURATION } from './quote.defaults';

export type QuoteLang = 'az' | 'tr' | 'en';
export type QuoteReferenceLogo = { name: string; src: string };

// Only explicitly approved customer logos may be added here. An empty list omits the page.
export const APPROVED_REFERENCE_LOGOS: QuoteReferenceLogo[] = [];

type Copy = {
  documentTitle: string; proposal: string; preparedFor: string; preparedBy: string; quoteNo: string;
  date: string; validUntil: string; greeting: (name: string) => string; executiveTitle: string;
  intro: string; projectBrief: string; projectBriefText: string; collaboration: string; collaborationText: string;
  solutionTitle: string; solutionText: string; aboutTitle: string; aboutText: string; benefitsTitle: string;
  benefits: string[]; scopeTitle: string; scopeText: string; pricingTitle: string; pricingLead: string;
  item: string; qty: string; unitPrice: string; lineTotal: string; users: string; posTerminals: string;
  mobileTerminals: string; monthlyTotal: string; oneTime: string; setupFee: string; discount: string;
  netSetup: string; firstYear: string; firstYearLead: string; commercialTitle: string; commercialLead: string;
  projectDuration: string; paymentPlan: string; delivery: string; support: string; deliveryText: string;
  supportText: string; projectDurationDefault: string; paymentPlanDefault: string; vat: string; validity: string; outOfScope: string; travel: string; notes: string;
  notesContinued: string; closingTitle: string; closingText: string; referencesTitle: string;
  referencesLead: string; referenceExperience: string; confidential: string; page: string; contact: string;
};

const I18N: Record<QuoteLang, Copy> = {
  az: {
    documentTitle: 'Korporativ Qiymət Təklifi', proposal: 'Biznesinizi vahid mərkəzdən idarə edən Kalem Platform həlli',
    preparedFor: 'Təklif edilən', preparedBy: 'Hazırlayan', quoteNo: 'Təklif №', date: 'Tarix', validUntil: 'Etibarlılıq',
    greeting: (name) => `Hörmətli ${name},`, executiveTitle: 'İcraçı xülasəsi',
    intro: 'Görüşümüz və ehtiyaclarınız əsasında hazırladığımız Kalem Platform təklifini təqdim edirik. Məqsədimiz pərakəndə satış əməliyyatlarınızı təhlükəsiz, ölçülə bilən və vahid idarəetmə mühitində birləşdirməkdir.',
    projectBrief: 'Layihənin məqsədi', projectBriefText: 'Mərkəz, filial, POS və mobil əməliyyatların bir platformada idarəsi; məlumat görünürlüğünün və əməliyyat nəzarətinin artırılması.',
    collaboration: 'İş modeli', collaborationText: 'Təsdiqdən sonra layihə başlanğıc görüşü keçirilir, girişlər və məsuliyyətlər müəyyənləşdirilir, tətbiq təqvimi razılaşdırılır.',
    solutionTitle: 'Təklif olunan həll', solutionText: 'Kalem Platform mərkəz, mağaza, POS və mobil əməliyyatları birləşdirən bulud əsaslı pərakəndə satış idarəetmə platformasıdır. Modul quruluş biznesiniz böyüdükcə tutumun çevik artırılmasına imkan verir.',
    aboutTitle: 'Kalem yanaşması', aboutText: 'Biz texnologiyanı yalnız proqram təminatı kimi deyil, proseslərin sadələşdirilməsi və davamlı idarəetmə üçün biznes aləti kimi tətbiq edirik.',
    benefitsTitle: 'Biznesinizə qazandıracaqları', benefits: ['Mərkəz və filialların vahid paneldən idarəsi', 'Satış və əməliyyatlara real vaxt görünürlüğü', 'Rol əsaslı təhlükəsiz istifadəçi idarəetməsi', 'Ehtiyacla böyüyən çevik lisenziya modeli'],
    scopeTitle: 'Təklifin əhatə dairəsi', scopeText: 'Seçilmiş istifadəçi, POS və mobil terminal lisenziyaları; quraşdırma və işə salma xidməti; razılaşdırılmış layihə və ödəniş şərtləri.',
    pricingTitle: 'İnvestisiya xülasəsi', pricingLead: 'Aylıq lisenziya və birdəfəlik xidmətlər aydın şəkildə ayrılmışdır.',
    item: 'Məhsul / xidmət', qty: 'Say', unitPrice: 'Vahid', lineTotal: 'Cəmi', users: 'Kalem Platform istifadəçi lisenziyası', posTerminals: 'POS kassa lisenziyası', mobileTerminals: 'Mobil terminal lisenziyası', monthlyTotal: 'AYLIQ LİSENZİYA CƏMİ', oneTime: 'Birdəfəlik xidmətlər', setupFee: 'Quraşdırma və işə salma', discount: 'Təklif endirimi', netSetup: 'Xalis quraşdırma məbləği', firstYear: 'İLK İL ÜMUMİ İNVESTİSİYA', firstYearLead: 'Xalis quraşdırma + 12 aylıq lisenziya',
    commercialTitle: 'Kommersiya və layihə şərtləri', commercialLead: 'Aydın, ölçülə bilən və izlənilə bilən çatdırılma çərçivəsi', projectDuration: 'Layihə müddəti', paymentPlan: 'Ödəniş planı', delivery: 'Çatdırılma', support: 'Dəstək', deliveryText: 'Lisenziyalar və xidmət girişləri ödəniş planına uyğun aktivləşdirilir.', supportText: 'Canlı keçiddən sonrakı dəstək razılaşdırılmış xidmət səviyyəsinə uyğun göstərilir.', projectDurationDefault: 'Təsdiq və lazımi girişlər təmin edildikdən sonra təxmini 45-65 iş günü.', paymentPlanDefault: 'Quraşdırma məbləğinin 50%-i sifariş zamanı, 50%-i canlı keçid tamamlandıqda ödənilir.', vat: 'Qiymətlərə qüvvədə olan vergilər daxil deyil.', validity: 'Təklif tərtib tarixindən etibarən 30 gün qüvvədədir.', outOfScope: 'Əhatə xaricindəki tələblər ayrıca qiymətləndirilir və yazılı təsdiqə təqdim olunur.', travel: 'Səyahət və yaşayış xərcləri lazım olduqda əvvəlcədən razılaşdırılır.', notes: 'Əlavə qeydlər', notesContinued: 'Əlavə qeydlər - davamı', closingTitle: 'Növbəti addım', closingText: 'Təklif təsdiqləndikdən sonra layihə başlanğıc görüşü planlaşdırılır və tətbiq təqvimi qarşılıqlı şəkildə dəqiqləşdirilir.', referencesTitle: 'Seçilmiş referanslar', referencesLead: 'Yalnız yazılı şəkildə təsdiqlənmiş müştəri loqoları bu bölmədə göstərilir.', referenceExperience: 'Pərakəndə, paylama və çoxfiliallı şirkətlərdə mərkəzi idarəetmə təcrübəsi.', confidential: 'MƏXFİ - Yalnız təklif edilən qurumun istifadəsi üçündür', page: 'Səhifə', contact: 'info@kalemyazilim.az  |  kalemyazilim.az',
  },
  tr: {
    documentTitle: 'Kurumsal Fiyat Teklifi', proposal: 'İşletmenizi tek merkezden yöneten Kalem Platform çözümü',
    preparedFor: 'Teklif sunulan', preparedBy: 'Hazırlayan', quoteNo: 'Teklif No', date: 'Tarih', validUntil: 'Geçerlilik',
    greeting: (name) => `Sayın ${name},`, executiveTitle: 'Yönetici özeti',
    intro: 'Görüşmemiz ve ihtiyaçlarınız doğrultusunda hazırladığımız Kalem Platform teklifini bilgilerinize sunarız. Amacımız perakende operasyonlarınızı güvenli, ölçeklenebilir ve tek bir yönetim ortamında bir araya getirmektir.',
    projectBrief: 'Projenin amacı', projectBriefText: 'Merkez, şube, POS ve mobil operasyonların tek platformdan yönetilmesi; veri görünürlüğünün ve operasyonel kontrolün artırılması.',
    collaboration: 'Çalışma modeli', collaborationText: 'Onay sonrasında proje başlangıç toplantısı yapılır, erişimler ve sorumluluklar belirlenir, uygulama takvimi karşılıklı olarak kesinleştirilir.',
    solutionTitle: 'Önerilen çözüm', solutionText: 'Kalem Platform; merkez, mağaza, POS ve mobil operasyonları bir araya getiren bulut tabanlı perakende yönetim platformudur. Modüler yapısı, işletmeniz büyüdükçe kapasitenin esnek biçimde artırılmasını sağlar.',
    aboutTitle: 'Kalem yaklaşımı', aboutText: 'Teknolojiyi yalnızca bir yazılım ürünü olarak değil; süreçleri sadeleştiren, ölçülebilir ve sürdürülebilir yönetim sağlayan bir iş aracı olarak ele alıyoruz.',
    benefitsTitle: 'İşletmenize sağlayacağı değer', benefits: ['Merkez ve şubelerin tek panelden yönetimi', 'Satış ve operasyonlara gerçek zamanlı görünürlük', 'Rol tabanlı, güvenli kullanıcı yönetimi', 'İhtiyaca göre büyüyen esnek lisanslama modeli'],
    scopeTitle: 'Teklif kapsamı', scopeText: 'Seçilen kullanıcı, POS ve mobil terminal lisansları; kurulum ve devreye alma hizmeti; mutabık kalınan proje ve ödeme koşulları.',
    pricingTitle: 'Yatırım özeti', pricingLead: 'Aylık lisans maliyetleri ile tek seferlik hizmetler açık biçimde ayrıştırılmıştır.',
    item: 'Ürün / hizmet', qty: 'Adet', unitPrice: 'Birim', lineTotal: 'Toplam', users: 'Kalem Platform kullanıcı lisansı', posTerminals: 'POS kasa lisansı', mobileTerminals: 'Mobil terminal lisansı', monthlyTotal: 'AYLIK LİSANS TOPLAMI', oneTime: 'Tek seferlik hizmetler', setupFee: 'Kurulum ve devreye alma', discount: 'Teklif indirimi', netSetup: 'Net kurulum bedeli', firstYear: 'İLK YIL TOPLAM YATIRIM', firstYearLead: 'Net kurulum + 12 aylık lisans',
    commercialTitle: 'Ticari ve proje şartları', commercialLead: 'Net, ölçülebilir ve takip edilebilir teslimat çerçevesi', projectDuration: 'Proje süresi', paymentPlan: 'Ödeme planı', delivery: 'Teslimat', support: 'Destek', deliveryText: 'Lisanslar ve servis erişimleri ödeme planına bağlı olarak devreye alınır.', supportText: 'Canlı geçiş sonrası destek, mutabık kalınan hizmet seviyesine göre yürütülür.', projectDurationDefault: DEFAULT_PROJECT_DURATION, paymentPlanDefault: DEFAULT_PAYMENT_TERMS, vat: 'Fiyatlara yürürlükteki vergiler dahil değildir.', validity: 'Teklif, düzenlenme tarihinden itibaren 30 gün geçerlidir.', outOfScope: 'Kapsam dışı talepler ayrıca değerlendirilir ve yazılı onaya sunulur.', travel: 'Seyahat ve konaklama giderleri gerektiğinde önceden mutabık kalınarak yansıtılır.', notes: 'Ek notlar', notesContinued: 'Ek notlar - devamı', closingTitle: 'Sonraki adım', closingText: 'Teklif onayından sonra proje başlangıç toplantısı planlanır ve uygulama takvimi karşılıklı olarak kesinleştirilir.', referencesTitle: 'Seçili referanslar', referencesLead: 'Bu bölümde yalnızca yazılı olarak onaylanmış müşteri logoları gösterilir.', referenceExperience: 'Perakende, dağıtım ve çok şubeli işletmelerde merkezi yönetim deneyimi.', confidential: 'GİZLİ - Yalnızca teklif sunulan kurumun kullanımına özeldir', page: 'Sayfa', contact: 'info@kalemyazilim.az  |  kalemyazilim.az',
  },
  en: {
    documentTitle: 'Corporate Price Proposal', proposal: 'Kalem Platform for centrally managed retail operations',
    preparedFor: 'Prepared for', preparedBy: 'Prepared by', quoteNo: 'Proposal no.', date: 'Date', validUntil: 'Validity',
    greeting: (name) => `Dear ${name},`, executiveTitle: 'Executive summary',
    intro: 'Based on our discussion and requirements, we are pleased to present the Kalem Platform proposal. Our goal is to bring your retail operations together in one secure, scalable management environment.',
    projectBrief: 'Project objective', projectBriefText: 'Manage headquarters, branches, POS and mobile operations from one platform while improving data visibility and operational control.',
    collaboration: 'Delivery model', collaborationText: 'Following approval, we hold a project kick-off, confirm access and responsibilities, and agree on the implementation schedule.',
    solutionTitle: 'Proposed solution', solutionText: 'Kalem Platform is a cloud-based retail management platform bringing headquarters, stores, POS and mobile operations together. Its modular architecture lets capacity scale as your business grows.',
    aboutTitle: 'The Kalem approach', aboutText: 'We treat technology not only as software, but as a business tool that simplifies processes and enables measurable, sustainable management.',
    benefitsTitle: 'Business value', benefits: ['Central management of headquarters and branches', 'Real-time visibility into sales and operations', 'Secure, role-based user management', 'Flexible licensing that scales with demand'],
    scopeTitle: 'Proposal scope', scopeText: 'Selected user, POS and mobile terminal licenses; setup and commissioning; agreed project and payment terms.',
    pricingTitle: 'Investment summary', pricingLead: 'Monthly license costs and one-time services are presented separately.',
    item: 'Product / service', qty: 'Qty', unitPrice: 'Unit', lineTotal: 'Total', users: 'Kalem Platform user license', posTerminals: 'POS register license', mobileTerminals: 'Mobile terminal license', monthlyTotal: 'MONTHLY LICENSE TOTAL', oneTime: 'One-time services', setupFee: 'Setup and commissioning', discount: 'Proposal discount', netSetup: 'Net setup fee', firstYear: 'TOTAL FIRST-YEAR INVESTMENT', firstYearLead: 'Net setup + 12 months of licenses',
    commercialTitle: 'Commercial and project terms', commercialLead: 'A clear, measurable and trackable delivery framework', projectDuration: 'Project duration', paymentPlan: 'Payment plan', delivery: 'Delivery', support: 'Support', deliveryText: 'Licenses and service access are activated in line with the payment plan.', supportText: 'Post go-live support is provided under the agreed service level.', projectDurationDefault: 'Approximately 45-65 business days after approval and required access are provided.', paymentPlanDefault: '50% of the setup fee is due upon order and 50% upon completion of go-live.', vat: 'Prices exclude applicable taxes.', validity: 'This proposal is valid for 30 days from its issue date.', outOfScope: 'Out-of-scope requests are evaluated separately and submitted for written approval.', travel: 'Travel and accommodation expenses are agreed in advance when required.', notes: 'Additional notes', notesContinued: 'Additional notes - continued', closingTitle: 'Next step', closingText: 'Following approval, a project kick-off meeting will be scheduled and the implementation plan will be finalized together.', referencesTitle: 'Selected references', referencesLead: 'Only customer logos with written approval are shown in this section.', referenceExperience: 'Central management experience across retail, distribution and multi-branch organizations.', confidential: 'CONFIDENTIAL - Intended solely for the recipient', page: 'Page', contact: 'info@kalemyazilim.az  |  kalemyazilim.az',
  },
};

const LOCALE: Record<QuoteLang, string> = { az: 'az-AZ', tr: 'tr-TR', en: 'en-US' };

@Injectable()
export class QuotePdfService {
  constructor(private readonly pdf: PdfService) {}

  renderHtml(quote: Quote, lang: QuoteLang, referenceLogos: QuoteReferenceLogo[] = APPROVED_REFERENCE_LOGOS): string {
    const t = I18N[lang];
    const created = new Date(quote.createdAt);
    const validUntil = new Date(created);
    validUntil.setDate(validUntil.getDate() + 30);
    const formatDate = (date: Date) => date.toLocaleDateString(LOCALE[lang]);
    const money = (value: string | number) => `${Number(value || 0).toLocaleString(LOCALE[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${this.escape(quote.currency)}`;
    const lineTotal = (qty: number, unit: string) => money(qty * Number(unit));
    const customer = this.escape(quote.customerName);
    const contactName = this.escape(quote.contactName || quote.customerName);
    const quoteNumber = this.escape(quote.quoteNumber || `KL-${created.getFullYear()}-${quote.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`);
    const setupFee = quote.setupFee ?? '0';
    const setupNetTotal = quote.setupNetTotal ?? setupFee;
    const monthlyTotal = quote.monthlyTotal;
    const firstYearTotal = quote.firstYearTotal ?? (Number(monthlyTotal) * 12 + Number(setupNetTotal)).toFixed(2);
    const discountAmount = Math.max(0, Number(setupFee) - Number(setupNetTotal));
    const discountLabel = quote.discountType === QuoteDiscountType.PERCENT
      ? `${t.discount} (${Number(quote.discountValue || 0).toLocaleString(LOCALE[lang])}%)`
      : t.discount;
    const rows = [
      { label: t.users, qty: quote.seats, unit: quote.pricePerUser },
      { label: t.posTerminals, qty: quote.posTerminals, unit: quote.pricePerPosTerminal },
      ...(quote.mobileTerminals > 0 ? [{ label: t.mobileTerminals, qty: quote.mobileTerminals, unit: quote.pricePerMobileTerminal }] : []),
    ];
    const noteParts = this.splitNotes(quote.notes ?? '');
    const projectDuration = !quote.projectDurationText || quote.projectDurationText === DEFAULT_PROJECT_DURATION
      ? t.projectDurationDefault
      : quote.projectDurationText;
    const paymentTerms = !quote.paymentTermsText || quote.paymentTermsText === DEFAULT_PAYMENT_TERMS
      ? t.paymentPlanDefault
      : quote.paymentTermsText;
    const pages: string[] = [];
    const brand = `<div class="brand"><img src="http://website/assets/kalem-logo.png" alt="Kalem"><b>KALEM <span>YAZILIM</span></b></div>`;
    const header = (section: string) => `<div class="topbar">${brand}<strong>${this.escape(section)}</strong></div>`;

    pages.push(`<section class="page cover"><div class="cover-hero">${brand}<div class="cover-eyebrow">${t.documentTitle}</div><h1>${t.proposal}</h1></div><div class="cover-client"><h2>${customer}</h2><p>${t.preparedFor}${quote.contactName ? ` - ${contactName}` : ''}</p></div><div class="cover-meta"><div><small>${t.quoteNo}</small><b>${quoteNumber}</b></div><div><small>${t.date}</small><b>${formatDate(created)}</b></div><div><small>${t.validUntil}</small><b>${formatDate(validUntil)}</b></div><div class="cover-contact"><small>${t.preparedBy}</small><b>Kalem Yazılım</b>${quote.contactEmail ? `<span>${this.escape(quote.contactEmail)}</span>` : ''}</div></div><div class="cover-bottom"><b>Kalem Yazılım ve Bilgi Teknolojileri</b><span>${t.contact}</span><em>01</em></div>__FOOTER__</section>`);

    pages.push(`<section class="page">${header(t.executiveTitle)}<main><div class="section-kicker">01 / ${t.executiveTitle}</div><h2>${t.greeting(contactName)}</h2><p class="lead">${t.intro}</p><div class="executive-grid"><article><span>01</span><h3>${t.projectBrief}</h3><p>${t.projectBriefText}</p></article><article><span>02</span><h3>${t.collaboration}</h3><p>${t.collaborationText}</p></article></div><div class="message"><b>${t.closingTitle}</b><p>${t.closingText}</p></div></main>__FOOTER__</section>`);

    pages.push(`<section class="page">${header(t.solutionTitle)}<main><div class="section-kicker">02 / ${t.solutionTitle}</div><h2>${t.solutionTitle}</h2><p class="lead">${t.solutionText}</p><div class="about"><h3>${t.aboutTitle}</h3><p>${t.aboutText}</p></div><h3 class="block-title">${t.benefitsTitle}</h3><div class="benefits">${t.benefits.map((benefit, index) => `<article><b>0${index + 1}</b><span>${benefit}</span></article>`).join('')}</div><div class="scope"><small>${t.scopeTitle}</small><p>${t.scopeText}</p></div></main>__FOOTER__</section>`);

    pages.push(`<section class="page">${header(t.pricingTitle)}<main><div class="section-kicker">03 / ${t.pricingTitle}</div><h2>${t.pricingTitle}</h2><p class="lead compact">${t.pricingLead}</p><table><thead><tr><th>${t.item}</th><th>${t.qty}</th><th>${t.unitPrice}</th><th>${t.lineTotal}</th></tr></thead><tbody>${rows.map((row) => `<tr><td><b>${row.label}</b></td><td>${row.qty}</td><td>${money(row.unit)}</td><td><b>${lineTotal(row.qty, row.unit)}</b></td></tr>`).join('')}</tbody></table><div class="monthly"><span>${t.monthlyTotal}</span><strong>${money(monthlyTotal)}</strong></div><h3 class="block-title">${t.oneTime}</h3><div class="investment"><div class="setup"><p><span>${t.setupFee}</span><b>${money(setupFee)}</b></p>${discountAmount > 0 ? `<p class="discount"><span>${discountLabel}</span><b>- ${money(discountAmount)}</b></p>` : ''}<p class="net"><span>${t.netSetup}</span><b>${money(setupNetTotal)}</b></p></div><div class="first-year"><small>${t.firstYear}</small><strong>${money(firstYearTotal)}</strong><span>${t.firstYearLead}</span></div></div><p class="tax-note">${t.vat}</p></main>__FOOTER__</section>`);

    pages.push(`<section class="page">${header(t.commercialTitle)}<main><div class="section-kicker">04 / ${t.commercialTitle}</div><h2>${t.commercialTitle}</h2><p class="commercial-lead">${t.commercialLead}</p><div class="term-list"><article><b>01</b><div><h3>${t.projectDuration}</h3><p>${this.escape(projectDuration)}</p></div></article><article><b>02</b><div><h3>${t.paymentPlan}</h3><p>${this.escape(paymentTerms)}</p></div></article><article><b>03</b><div><h3>${t.delivery}</h3><p>${t.deliveryText}</p></div></article><article><b>04</b><div><h3>${t.support}</h3><p>${t.supportText}</p></div></article></div><ul class="conditions"><li>${t.vat}</li><li>${t.validity}</li><li>${t.outOfScope}</li><li>${t.travel}</li></ul>${noteParts[0] ? `<div class="notes"><b>${t.notes}</b><p>${this.escape(noteParts[0])}</p></div>` : ''}<div class="next"><b>${t.closingTitle}</b><p>${t.closingText}</p></div></main>__FOOTER__</section>`);

    if (noteParts[1]) {
      pages.push(`<section class="page">${header(t.notesContinued)}<main><div class="section-kicker">05 / ${t.notesContinued}</div><h2>${t.notesContinued}</h2><div class="notes continuation"><p>${this.escape(noteParts[1])}</p></div></main>__FOOTER__</section>`);
    }

    if (referenceLogos.length > 0) {
      pages.push(`<section class="page">${header(t.referencesTitle)}<main><div class="section-kicker">${String(pages.length).padStart(2, '0')} / ${t.referencesTitle}</div><h2>${t.referencesTitle}</h2><p class="lead compact">${t.referencesLead}</p><div class="reference-grid">${referenceLogos.map((logo) => `<article><img src="${this.escape(logo.src)}" alt="${this.escape(logo.name)}"><span>${this.escape(logo.name)}</span></article>`).join('')}</div><div class="reference-message"><h3>${t.aboutTitle}</h3><p>${t.referenceExperience}</p></div></main>__FOOTER__</section>`);
    }

    const totalPages = pages.length;
    const body = pages.map((page, index) => page.replace('__FOOTER__', `<footer><span>${t.confidential}</span><span>${t.contact}</span><b>${t.page} ${index + 1} / ${totalPages}</b></footer>`)).join('');

    return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
      @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;color:#15343b;font-family:Arial,'Noto Sans',sans-serif;background:#fff}.page{position:relative;width:210mm;height:297mm;padding:27mm 16mm 17mm;overflow:hidden;page-break-after:always;background:#fff}.page:last-child{page-break-after:auto}.topbar{position:absolute;left:0;right:0;top:0;height:18mm;padding:3.5mm 16mm;display:flex;align-items:center;justify-content:space-between;background:#092d35;color:#fff}.topbar>strong{font-size:7.5pt;letter-spacing:.7px;text-transform:uppercase}.brand{display:flex;align-items:center;gap:2mm}.brand img{width:24mm;height:10mm;object-fit:contain}.brand b{font-size:8pt;letter-spacing:1px;color:#fff}.brand b span{color:#83d5de;font-weight:400}.cover{padding:0;background:#f3f7f8}.cover-hero{height:82mm;padding:16mm;background:#092d35;border-bottom:3mm solid #18a7b7}.cover-hero .brand{margin-bottom:15mm}.cover-eyebrow{color:#8bd7df;font-size:9pt;font-weight:700;letter-spacing:1.2px}.cover h1{max-width:170mm;margin:4mm 0 0;color:#fff;font-size:27pt;line-height:1.17;letter-spacing:-.5px}.cover-client{padding:14mm 16mm 0}.cover-client h2{margin:0 0 3mm;color:#087f8e;font-size:15pt}.cover-client p{margin:0;color:#61777c;font-size:9pt}.cover-meta{margin:11mm 16mm 0;padding:8mm;display:grid;grid-template-columns:repeat(3,1fr);gap:7mm;border:1px solid #d6e3e5;border-radius:5mm;background:#fff}.cover-meta small{display:block;margin-bottom:2.5mm;color:#687e83;font-size:7pt;font-weight:700;text-transform:uppercase}.cover-meta b{font-size:10pt;color:#0b2d35}.cover-contact{grid-column:1/-1;padding-top:5mm;border-top:1px solid #dce6e8}.cover-contact b{margin-right:8mm}.cover-contact span{color:#61777c;font-size:8.5pt}.cover-bottom{position:absolute;left:0;right:0;bottom:0;height:25mm;padding:6.5mm 16mm;background:#092d35;color:#fff}.cover-bottom>b{display:block;font-size:8.5pt}.cover-bottom>span{display:block;margin-top:2mm;color:#a8d1d6;font-size:7pt}.cover-bottom em{position:absolute;right:16mm;top:5mm;color:#18a7b7;font-size:25pt;font-weight:700;font-style:normal}main{height:100%}.section-kicker{margin-bottom:5mm;color:#087f8e;font-size:7.5pt;font-weight:700;letter-spacing:.8px;text-transform:uppercase}h2{margin:0 0 7mm;color:#102f37;font-size:22pt;line-height:1.2}h3{margin:0;color:#102f37}.lead{margin:0;color:#29464d;font-size:10.5pt;line-height:1.65}.lead.compact{font-size:9pt;margin-bottom:6mm}.executive-grid{display:grid;grid-template-columns:1fr 1fr;gap:7mm;margin-top:14mm}.executive-grid article{min-height:57mm;padding:8mm;border:1px solid #d7e4e6;border-radius:4mm}.executive-grid article>span{display:grid;width:12mm;height:12mm;place-items:center;margin-bottom:8mm;border-radius:3mm;background:#e6f6f7;color:#087f8e;font-size:9pt;font-weight:700}.executive-grid h3{margin-bottom:4mm;font-size:11pt}.executive-grid p,.message p,.about p,.scope p{margin:0;color:#61777c;font-size:9pt;line-height:1.6}.message{margin-top:13mm;padding:8mm;border-radius:4mm;background:#092d35;color:#fff}.message>b{color:#86d7df;font-size:8pt;text-transform:uppercase}.message p{margin-top:3mm;color:#fff}.about{margin-top:11mm;padding:7mm;border-left:1.5mm solid #18a7b7;background:#f3f8f9}.about h3{margin-bottom:3mm;font-size:11pt}.block-title{margin:10mm 0 5mm;font-size:11pt}.benefits{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.benefits article{min-height:28mm;padding:5mm;border:1px solid #dce6e8;border-radius:3mm;background:#fff}.benefits b{display:block;margin-bottom:3mm;color:#18a7b7;font-size:8pt}.benefits span{font-size:8.5pt;line-height:1.4}.scope{margin-top:9mm;padding:7mm;border-radius:4mm;background:#092d35}.scope small{color:#85d4dd;font-size:7.5pt;font-weight:700;text-transform:uppercase}.scope p{margin-top:3mm;color:#fff}table{width:100%;border-collapse:collapse;font-size:8.5pt}th{padding:4mm 3mm;background:#092d35;color:#fff;font-size:7pt;text-align:left;text-transform:uppercase}th:nth-child(n+2),td:nth-child(n+2){text-align:right}td{padding:4.5mm 3mm;border-bottom:1px solid #dce6e8}tbody tr:nth-child(even) td{background:#f3f7f8}.monthly{margin-top:5mm;padding:6mm;display:flex;align-items:center;justify-content:space-between;border-radius:4mm;background:#e5f6f7}.monthly span{color:#087f8e;font-size:8pt;font-weight:700}.monthly strong{font-size:17pt;color:#102f37}.investment{display:grid;grid-template-columns:1fr 1fr;gap:7mm}.setup{padding:6mm;border:1px solid #d7e4e6;border-radius:4mm}.setup p{display:flex;justify-content:space-between;margin:0;padding:3mm 0;color:#61777c;font-size:8pt;border-bottom:1px solid #dce6e8}.setup p:last-child{border:0}.setup p b{color:#102f37}.setup .discount b{color:#bd4545}.setup .net{font-weight:700}.first-year{padding:7mm;border-radius:4mm;background:#092d35;color:#fff}.first-year small{display:block;color:#86d7df;font-size:7.5pt;font-weight:700}.first-year strong{display:block;margin:8mm 0 4mm;font-size:18pt;text-align:right}.first-year span{display:block;color:#b2d0d4;font-size:7.5pt}.tax-note{margin-top:6mm;color:#687e83;font-size:7.5pt}.commercial-lead{margin:-2mm 0 8mm;color:#087f8e;font-size:9.5pt;font-weight:700}.term-list{display:grid;gap:3mm}.term-list article{display:grid;grid-template-columns:13mm 1fr;gap:5mm;padding:4mm;border:1px solid #d7e4e6;border-radius:3mm}.term-list article>b{display:grid;width:10mm;height:10mm;place-items:center;border-radius:2.5mm;background:#e6f6f7;color:#087f8e;font-size:8pt}.term-list h3{margin:0 0 1.5mm;font-size:8.5pt}.term-list p{margin:0;color:#61777c;font-size:7.5pt;line-height:1.4}.conditions{display:grid;grid-template-columns:1fr 1fr;gap:3mm 8mm;margin:6mm 0;padding-left:5mm}.conditions li{padding-left:1mm;color:#29464d;font-size:7.2pt;line-height:1.4}.conditions li::marker{color:#18a7b7}.notes{padding:4mm;border-left:1mm solid #18a7b7;background:#f3f8f9}.notes>b{color:#087f8e;font-size:7.5pt}.notes p{margin:2mm 0 0;color:#29464d;font-size:7.5pt;line-height:1.45;white-space:pre-wrap}.notes.continuation{padding:8mm}.notes.continuation p{font-size:9pt;line-height:1.65}.next{margin-top:5mm;padding:4mm 5mm;border-radius:3mm;background:#092d35}.next>b{color:#86d7df;font-size:7pt;text-transform:uppercase}.next p{margin:1.5mm 0 0;color:#fff;font-size:7.5pt;line-height:1.4}.reference-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6mm;margin-top:8mm}.reference-grid article{height:29mm;padding:4mm;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid #d7e4e6;border-radius:4mm}.reference-grid img{max-width:29mm;max-height:14mm;object-fit:contain}.reference-grid span{margin-top:3mm;color:#61777c;font-size:6.5pt;text-align:center}.reference-message{margin-top:14mm;padding:8mm;border-radius:4mm;background:#092d35;color:#fff}.reference-message h3{color:#fff;font-size:14pt}.reference-message p{margin:3mm 0 0;color:#b2d0d4;font-size:9pt}footer{position:absolute;left:16mm;right:16mm;bottom:7mm;padding-top:3mm;display:flex;justify-content:space-between;border-top:1px solid #d7e4e6;color:#687e83;font-size:6.2pt}footer b{color:#496369}.cover footer{display:none}
    </style></head><body>${body}</body></html>`;
  }

  async renderPdf(quote: Quote, lang: QuoteLang): Promise<Buffer> {
    return this.pdf.htmlToPdf(this.renderHtml(quote, lang));
  }

  private splitNotes(notes: string): [string, string] {
    const clean = notes.trim();
    if (clean.length <= 450) return [clean, ''];
    const splitAt = clean.lastIndexOf(' ', 450);
    const index = splitAt > 300 ? splitAt : 450;
    return [clean.slice(0, index).trim(), clean.slice(index).trim()];
  }

  private escape(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
}
