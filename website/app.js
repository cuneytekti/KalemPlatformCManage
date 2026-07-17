/* Kalem Platform kurumsal site — i18n + fiyat hesaplayıcı + form */
'use strict';

const CONFIG = {
  // Website nginx /api isteklerini Docker iç ağındaki CManage API'ye iletir.
  leadEndpoint: '/api/leads',
  leadEmail: 'info@kalemyazilim.az',
};

/* ── i18n (az = HTML varsayılanı) ── */
const I18N = { az: {}, tr: {}, en: {} };

I18N.tr = {
  'top.line': '7/24 destek hattı', 'top.loc': 'Bakü · İstanbul',
  'nav.why': 'Neden Kalem?', 'nav.modules': 'Modüller', 'nav.integrations': 'Entegrasyonlar',
  'nav.pricing': 'Teklif', 'nav.contact': 'İletişim', 'nav.demo': 'Demo iste',
  'hero.eyebrow': '1989’dan beri · 2.000+ başarılı proje',
  'hero.title': 'Perakendeyi uçtan uca yöneten platform',
  'hero.lead': 'Kalem Platform, 1989’dan beri sahada kazanılan deneyimle geliştirilmiş, ERP\'den bağımsız çalışan perakende yönetim motorudur. Kasadan CRM\'e, satın almadan üretime ve yapay zekâ destekli yönetime kadar tüm operasyonlarınız tek platformda.',
  'hero.cta1': 'Demo planla', 'hero.cta2': 'Modülleri keşfet',
  'hero.b1': '✓ Sertifikalı e-Kassa entegrasyonu', 'hero.b2': '✓ ERP\'den bağımsız çalışma', 'hero.b3': '✓ 7/24 canlı destek',
  'hero.mock.title': 'KBoss · Günlük Özet', 'hero.mock.item1': 'Ciro (tüm şubeler)', 'hero.mock.item2': 'Onay bekleyen süreçler',
  'hero.mock.item3': 'SKT uyarısı', 'hero.mock.total': 'AI önerisi', 'hero.mock.ai': '3 sipariş hazır',
  'hero.mock.pay': '🎙 “KBoss, haftalık raporu hazırla”',
  'strip.years': 'yılından beri sektör deneyimi', 'strip.countries': 'tamamlanmış proje',
  'strip.support': 'canlı destek ekibi', 'strip.uptime': 'bağımsız ve entegre edilebilir',
  'why.title': 'Neden Kalem Platform?',
  'why.lead': '1989’dan beri 2.000’den fazla projede şekillenen deneyim — perakende ekiplerinin gerçek ihtiyaçlarından doğmuş birleşik yönetim platformu.',
  'why1.t': 'ERP\'den bağımsız çalışma', 'why1.d': 'Perakende yönetiminiz ERP\'ye bağımlı kalmaz: platform tamamen bağımsız çalışır. İsterseniz SAP, LOGO, Mikro, 1C, jRetail, Venüt, Microsoft Dynamics 365 gibi önde gelen ERP\'lerle değişken veriler API üzerinden çift yönlü senkronize olur.',
  'why2.t': 'Donanımdan bağımsız çalışma', 'why2.d': 'Özel sunucu ve sistem desteği gerektirmez. Mevcut kasa bilgisayarları, Android cihazlar ve tarayıcı — bu kadar. Donanım yatırımı olmadan başlayın.',
  'why3.t': 'Uluslararası standartlarda şifreleme', 'why3.d': 'Tüm veriler uluslararası standartlarda şifrelenir; hassas bilgiler rol bazlı gizlenir. Her müşteri tamamen izole edilmiş ortamda tutulur.',
  'why4.t': 'Sertifikalı e-Kassa uygulaması', 'why4.d': 'Azerbaycan e-kassa entegrasyonu ile sertifikalı uygulama: satış, iade, X/Z raporları vergi gereksinimlerine tam uyumlu, otomatik fiskalizasyonla.',
  'why5.t': '7/24 destek', 'why5.d': 'Perakende gece gündüz çalışır, biz de öyle. 7/24 çalışan destek ekibimiz telefon, sohbet ve uzak bağlantıyla her an yanınızda.',
  'why6.t': 'Kalem Yazılım güvencesi', 'why6.d': '1989’dan beri 2.000’den fazla projede kazanılan saha deneyimi platformun her modülünde.',
  'mod.title': 'Modüller', 'mod.lead': 'Kasadan yönetim kuruluna — perakendenin her seviyesi için profesyonel modüller.',
  'm1.t': 'POS Satış', 'm1.d': 'Barkod öncelikli hızlı kasa: tartılı ürünler, indirimler, karma ödemeler, offline dayanıklılık ve banka terminalleriyle tam otomatik ödeme.',
  'm2.t': 'Back Office', 'm2.d': 'Ürün kataloğu, fiyat politikası, stok hareketleri, şube raporları ve rol bazlı kullanıcı yönetimi — tarayıcıdan.',
  'm3.t': 'CRM — Müşteri Kazanma', 'm3.d': '360° müşteri profili, çok kanallı sadakat, segmentasyon, kampanya ve otomasyon — müşteri kazanmaya odaklı CRM. Aşağıda ayrıntılı.',
  'm4.t': 'Süreç Yönetimi', 'm4.d': 'Fiyat değişikliğinden kampanyaya, SKT kontrolünden sayımlara — tüm operasyonlar mobil onay akışlarına bağlı. Ofiste olmadan yönetin.',
  'm5.t': 'KBoss — AI Yönetim', 'm5.d': 'Şirket sahipleri için yapay zekâ destekli yönetim: sesli komutla rapor hazırlama, görev yönetimi ve anlık KPI\'lar.',
  'm6.t': 'Satınalma', 'm6.d': 'Sözleşme şartlarına bağlı gondol, raf başı, kullanım alanı ve erken ödeme primleri; fiyat farkları ve hizmet faturalarının kullanıcı bağımsız otomatik oluşturulması. Satınalma ekibinizin alım gücüne güç katar.',
  'm7.t': 'Mağaza Proje Yönetimi', 'm7.d': 'Mağaza daha açılmadan: mimari çizimden AI destekli yerleşim planı, sözleşmelerdeki raf payı vaatlerine uygun kategori dağılımı ve tedarikçilere otomatik ilk siparişler.',
  'm8.t': 'Üretim', 'm8.d': 'Mağaza içi ve merkezi üretim (fırın, taze ürün): mamul–yarı mamul–hammadde izleme, üretim maliyetleri ve verimlilik analizi.',
  'm9.t': 'Mobil Depo Terminali', 'm9.d': 'Android el terminalleriyle mal kabul, sayım, raf etiketi ve fiyat kontrolü — depo operasyonları cebinizde.',
  'm10.t': 'B2B ve e-Fatura', 'm10.d': 'Tedarik zinciri yönetiminde B2B uygunluğu: tedarikçilerle e-fatura entegrasyonları, sipariş-fatura eşleştirmesi.',
  'm11.t': 'AI Mağaza Operasyonları', 'm11.d': 'Yapay zekâ destekli sipariş ve sayım önerileri, siparişlerin tedarikçilere otomatik gönderimi, sipariş kontrollü mal kabul ile tedarikçi performans ölçümü.',
  'm12.t': 'BI ve Raporlama', 'm12.d': 'Bold BI, Power BI ve Microsoft 365 ürünleriyle doğrudan entegrasyon: mevcut rapor kültürünüzü değiştirmeden derin analitik.',
  'm13.t': 'Demirbaş Satınalma ve İhale', 'm13.d': 'Demirbaş alımları için ihale yönetimi: ihale ilanı, şartname hazırlama, teklif değerlendirme ve satınalma adımları — hepsi onay akışlarına bağlı şeffaf süreç.',
  'm14.t': 'ServiceDesk — İç Hizmetler', 'm14.d': 'ServiceDesk tabanlı ticket yönetim sistemi: mağaza bazlı tamir, tadilat ve değişim işleri, merkez depodan sarf malzeme siparişleri — sürdürülebilir, izlenebilir süreç akışlarıyla.',
  'm15.t': 'Dönemsel Analiz — AI Yönetici Asistanı', 'm15.d': 'Dönemsel analiz şirket bünyesindeki finansal süreçlerin yönetimini kolaylaştırır. Karar alma, yönetme ve hızlı saha operasyonları için yapay zekâ destekli yönetici asistanı modülü.',
  'crm.eyebrow': 'CRM Modülü', 'crm.title': 'Müşteri kazanmaya odaklı CRM',
  'crm.lead': 'Müşteriyi tanıyın, segmentlere ayırın, doğru kampanyayla geri dönüşe çevirin. Kalem CRM satış noktasından mobil uygulamaya tüm kanalları tek müşteri görünümünde birleştirir.',
  'crm.b1': '<b>360° müşteri profili</b> — tüm kanallardan alışveriş, kampanya ve iletişim geçmişi tek ekranda',
  'crm.b2': '<b>Uçtan uca sadakat</b> — POS terminal, online satış ve Mobil App ile entegre çalışan tek sadakat programı',
  'crm.b3': '<b>Segmentasyon yönetimi</b> — müşteri davranışlarını belirleyin, hedefli teklifler gönderin',
  'crm.b4': '<b>Kampanya yönetimi</b> — merkezden planla, şubelerde anında aktifleştir',
  'crm.b5': '<b>Otomasyon</b> — doğum günleri ve özel günler kampanyalarla otomatik entegre',
  'crm.b6': '<b>Kuponlar</b> — kurumsal ve son kullanıcı odaklı kupon çözümleri',
  'crm.b7': '<b>AI destekli müşteri yönetimi</b> ve anlık KPI panelleri',
  'crm.b8': '<b>Çağrı merkezi entegrasyonları</b> — müşteri hizmetleri CRM\'le aynı ekranda',
  'crm.b9': '<b>ERP entegrasyonu</b> — değişken verilerin ERP\'lerle çift yönlü aktarımı',
  'crm.b10': '<b>API destekli uygulama entegrasyonları</b> — MilliON ve diğer ekosistem uygulamalarıyla hazır bağlantı',
  'crm.mock.t': 'Müşteri: Aysel M. · Gold segment', 'crm.mock.r1': 'Son 90 gün', 'crm.mock.r2': 'Sadakat bakiyesi',
  'crm.mock.r3': 'Doğum günü kampanyası', 'crm.mock.r3v': 'Yarın otomatik',
  'crm.mock.f': 'AI: “Süt ürünleri kuponu geri dönüş olasılığını 2,3× artırıyor”',
  'proc.eyebrow': 'Süreç Yönetimi', 'proc.title': 'Şirketiniz onay akışlarıyla çalışsın — siz neredeyseniz oradan',
  'proc.lead': 'Fiyat değişikliklerinden kampanyalara, son kullanma tarihi (SKT) kontrolünden sayımlara kadar sistemin tamamı süreç yönetimine bağlıdır. Her kritik işlem onay akışından geçer — ofiste olmadan, telefonunuzdaki mobil uygulamadan onaylayın.',
  'proc.b1': 'Fiyat değişikliği, kampanya, sayım ve SKT kontrolü — hepsi onaya bağlı',
  'proc.b2': 'Mobil uygulamadan bildirim → tek dokunuşla onay veya ret',
  'proc.b3': 'Yetki seviyelerine göre çok aşamalı onay zincirleri',
  'proc.b4': 'Her adım denetim günlüğünde — kim, ne zaman, neyi onayladı',
  'proc.mock.t': 'Onay bekliyor', 'proc.mock.r1': 'Fiyat değişikliği · 34 ürün', 'proc.mock.a1': 'Şube 5',
  'proc.mock.r2': 'SKT indirimi · süt rafı', 'proc.mock.a2': '−30%',
  'proc.mock.r3': 'Sayım sonucu · depo B', 'proc.mock.a3': 'Fark: %0,4',
  'proc.mock.ok': '✓ Onayla', 'proc.mock.no': '✕ Reddet',
  'kboss.title': 'Şirketinizi yapay zekâyla yönetin',
  'kboss.lead': 'KBoss — şirket sahipleri ve yönetim için hazırlanmış yapay zekâ destekli yönetim modülü. Rapor isteyin, görev verin, sonuçları izleyin — hepsini sesle.',
  'kboss.b1': 'Sesli AI asistanla rapor hazırlama: “bu haftanın şube karşılaştırmasını göster”',
  'kboss.b2': 'Görev yönetimi — sesle görev oluşturun, sorumluya otomatik iletilsin',
  'kboss.b3': 'Anlık KPI\'lar: ciro, marj, stok devri, şube performansı',
  'kboss.b4': 'Kritik durumlarda proaktif uyarı: anomali, kasa farkı, stok riski',
  'kboss.mock.q': '“KBoss, dünkü ciroyu şubelere göre karşılaştır”',
  'kboss.mock.a': 'Dün 12 şubede toplam 96.480 ₼. Şube 7 hedefin %18 üzerinde; Şube 3\'te süt kategorisinde stok riski var. Rapor e-postanıza gönderildi.',
  'ai.eyebrow': 'Yapay Zekâ Operasyonda', 'ai.title': 'AI destekli mağaza, sipariş ve sayım yönetimi',
  'ai.lead': 'Satış hızı, mevsimsellik ve stok seviyelerine dayanan öneriler günlük operasyon yükünü azaltır, tedarik zincirinizi ölçülebilir kılar.',
  'ai.b1': 'AI sipariş önerileri ve siparişlerin tedarikçilere <b>otomatik gönderimi</b>',
  'ai.b2': 'AI sayım önerileri — riskli kategorilerde hedefli sayım planları',
  'ai.b3': '<b>Sipariş kontrollü mal kabul</b>: gelen mal siparişle otomatik eşleştirilir',
  'ai.b4': 'Böylece <b>tedarikçi performansı</b> nesnel ölçülür: zamanında teslimat, eksik/fazla, fiyat uyumu',
  'ai.mock.t': 'Tedarikçi performansı · son 30 gün', 'ai.mock.ontime': 'zamanında', 'ai.mock.ontime2': 'zamanında',
  'ai.mock.f': 'AI: “TezSüd siparişlerini 1 gün öne çekin”',
  'int.title': 'Ekosistem entegrasyonları', 'int.lead': 'Pazarın önde gelen hizmetleriyle hazır, sertifikalı bağlantılar.',
  'int1.t': '🏛 Azerbaycan e-Kassa', 'int1.d': 'Sertifikalı fiskalizasyon uygulaması: satış, iade, vardiya, X/Z raporları — vergi gereksinimlerine tam uyumlu.',
  'int2.t': '🏦 Önde gelen bankalar — POS', 'int2.d': 'Azerbaycan\'ın önde gelen bankalarıyla kart terminali entegrasyonu: tutar kasadan terminale, sonuç otomatik kayda.',
  'int3.t': '🛵 Wolt · Bolt Food · Birmarket', 'int3.d': 'Pazarın önde gelen teslimat platformlarıyla entegrasyon: menü/fiyat senkronu ve siparişlerin doğrudan kasaya düşmesi.',
  'int4.t': '📲 Apple ve Android Wallet', 'int4.d': 'Müşterileriniz sadakat kartını yanında taşımasın: kart telefonun Wallet\'ında, kasada tek dokunuşla kullanım. Kullanıcı dostu deneyim.',
  'int5.t': '📊 Bold BI · Power BI · Microsoft 365', 'int5.d': 'BI ve ofis araçlarınızla doğrudan entegrasyon: canlı veri bağlantıları, otomatik rapor paylaşımı.',
  'int6.t': '🔄 Önde gelen ERP\'ler ve API', 'int6.d': 'SAP, LOGO, Mikro, 1C, jRetail, Venüt, Microsoft Dynamics 365 — pazarın önde gelen ERP ürünleriyle değişken veri entegrasyonu; MilliON gibi uygulamalarla API destekli hazır bağlantılar.',
  'sec.title': '🔐 Verileriniz uluslararası standartlarda korunur',
  'sec.lead': 'Tüm veriler uluslararası standartlarda şifrelenir. Hassas bilgiler rol bazlı gizlenir, her müşteri izole kendi ortamında çalışır, tüm işlemler denetim günlüğüne yazılır.',
  'sec.b1': 'Uçtan uca şifreleme (aktarımda ve saklamada)',
  'sec.b2': 'Bilgi gizleme: rol bazlı veri maskeleme',
  'sec.b3': 'Müşteri başına tamamen izole ortam',
  'price.eyebrow': 'Kurumsal teklif',
  'price.title': 'İhtiyacınıza uygun çözümü birlikte kuralım',
  'price.lead': 'Şube, kullanıcı ve operasyon modelinizi değerlendirelim; yalnızca ihtiyaç duyduğunuz modüller için size özel teklif hazırlayalım.',
  'price.f1': 'İhtiyaca uygun modüller', 'price.f2': 'Ölçeğe uygun lisanslama', 'price.f3': 'Geçiş ve eğitim planı',
  'price.users': 'Kullanıcı', 'price.pos': 'POS kasa', 'price.mobile': 'Mobil terminal',
  'price.monthly': 'Aylık', 'price.cta': 'Teklif al',
  'buy.cta': 'Hemen satın al', 'buy.title': 'Online abonelik',
  'buy.lead': 'Ödemeden sonra ortamınız otomatik kurulur, giriş bilgileri e-postanıza gönderilir.',
  'buy.company': 'Şirket adı', 'buy.email': 'E-posta', 'buy.slug': 'Subdomain',
  'buy.pay': 'Ödemeye geç', 'buy.err': 'İşlem başarısız. Lütfen tekrar deneyin veya bize yazın:',
  'buy.redirect': 'Banka ödeme sayfasına yönlendiriliyorsunuz...',
  'price.note': 'Ekibimiz ihtiyaçlarınızı dinleyip uygun çözüm ve uygulama planını sunsun.',
  'how.title': '3 adımda başlayın',
  'how.s1t': 'Başvurun', 'how.s1d': 'Formu doldurun — ekibimiz sizinle iletişime geçip ihtiyaçlarınızı dinler.',
  'how.s2t': 'Ortamınız kurulur', 'how.s2d': 'Size özel güvenli ortam otomatik oluşturulur: <b>siz.kalemplatform.com</b>. Verileriniz tam izolasyonda tutulur.',
  'how.s3t': 'Satışa başlayın', 'how.s3d': 'Ürünlerinizi aktarın (CSV/ERP), kasaları bağlayın ve aynı gün satışa başlayın. Eğitim ve 7/24 destek bizden.',
  'c.title': 'Demo ve teklif başvurusu', 'c.lead': 'İhtiyacınızı paylaşın; 1 iş günü içinde sizinle iletişime geçip uygun çözümü birlikte belirleyelim.',
  'c.baku': 'Bakü Ofisi (Azerbaycan)', 'c.ist': 'İstanbul Ofisi (Türkiye)', 'c.line': '7/24 destek hattı',
  'c.name': 'Ad Soyad', 'c.company': 'Şirket / Mağaza', 'c.email': 'E-posta', 'c.phone': 'Telefon',
  'c.msg': 'Mesajınız', 'c.send': 'Gönder',
  'c.mailOpen': 'E-posta uygulamanız açılıyor…', 'c.ok': 'Başvurunuz alındı, teşekkürler!', 'c.err': 'Gönderilemedi, lütfen e-posta ile ulaşın:',
  'footer.tag': '1989’dan beri · 2.000’den fazla proje deneyimi',
  'footer.rights': 'Tüm hakları saklıdır',
};

I18N.en = {
  'top.line': '24/7 support line', 'top.loc': 'Baku · Istanbul',
  'nav.why': 'Why Kalem?', 'nav.modules': 'Modules', 'nav.integrations': 'Integrations',
  'nav.pricing': 'Quote', 'nav.contact': 'Contact', 'nav.demo': 'Request demo',
  'hero.eyebrow': 'Since 1989 · 2,000+ successful projects',
  'hero.title': 'The platform that runs retail end to end',
  'hero.lead': 'Kalem Platform is an ERP-independent retail management engine shaped by field experience since 1989. From checkout and CRM to purchasing, production and AI-assisted management, every operation runs on one platform.',
  'hero.cta1': 'Book a demo', 'hero.cta2': 'Explore modules',
  'hero.b1': '✓ Certified e-Kassa integration', 'hero.b2': '✓ ERP-independent operation', 'hero.b3': '✓ 24/7 live support',
  'hero.mock.title': 'KBoss · Daily Brief', 'hero.mock.item1': 'Revenue (all branches)', 'hero.mock.item2': 'Pending approvals',
  'hero.mock.item3': 'Expiry alerts', 'hero.mock.total': 'AI suggestion', 'hero.mock.ai': '3 orders ready',
  'hero.mock.pay': '🎙 “KBoss, prepare the weekly report”',
  'strip.years': 'industry experience since', 'strip.countries': 'completed projects',
  'strip.support': 'live support team', 'strip.uptime': 'independent and integration-ready',
  'why.title': 'Why Kalem Platform?',
  'why.lead': 'Experience shaped through more than 2,000 projects since 1989 — one management platform born from the real needs of retail teams.',
  'why1.t': 'ERP-independent operation', 'why1.d': 'Your retail management never depends on an ERP: the platform runs fully standalone. When you want, variable data syncs bidirectionally via API with leading ERPs such as SAP, LOGO, Mikro, 1C, jRetail, Venüt and Microsoft Dynamics 365.',
  'why2.t': 'Hardware-independent operation', 'why2.d': 'No dedicated servers or system support required. Your existing register PCs, Android devices and a browser — that\'s it. Start without hardware investment.',
  'why3.t': 'Encryption to international standards', 'why3.d': 'All data is encrypted to international standards; sensitive information is masked by role. Every customer runs in a fully isolated environment.',
  'why4.t': 'Certified e-Kassa application', 'why4.d': 'Certified through the Azerbaijan e-kassa integration: sales, refunds, X/Z reports fully compliant with tax requirements, with automatic fiscalization.',
  'why5.t': '24/7 support', 'why5.d': 'Retail runs day and night — so do we. Our 24/7 support team is there by phone, chat and remote connection at any moment.',
  'why6.t': 'Backed by Kalem Software', 'why6.d': 'Field knowledge gained through more than 2,000 projects since 1989 is built into every module.',
  'mod.title': 'Modules', 'mod.lead': 'From the register to the boardroom — professional modules for every level of retail.',
  'm1.t': 'POS', 'm1.d': 'Barcode-first fast checkout: weighed goods, discounts, split payments, offline resilience and fully automated card payments with bank terminals.',
  'm2.t': 'Back Office', 'm2.d': 'Product catalog, pricing policy, stock movements, branch reporting and role-based user management — from the browser.',
  'm3.t': 'CRM — Customer Acquisition', 'm3.d': '360° customer profile, omnichannel loyalty, segmentation, campaigns and automation — a CRM focused on winning customers. Details below.',
  'm4.t': 'Process Management', 'm4.d': 'From price changes to campaigns, expiry control to stocktakes — every operation tied to mobile approval flows. Manage without being at the office.',
  'm5.t': 'KBoss — AI Management', 'm5.d': 'AI-assisted management for owners: voice-driven reporting, task management and live KPIs.',
  'm6.t': 'Purchasing', 'm6.d': 'Contract-driven gondola, shelf-end, floor-space and early-payment premiums; price differences and service invoices generated automatically without user effort. Strengthens your buying power.',
  'm7.t': 'Store Project Management', 'm7.d': 'Before the store even opens: AI-assisted layout plans from architectural drawings, category allocation honoring contracted shelf-share commitments, and automatic first orders to suppliers.',
  'm8.t': 'Production', 'm8.d': 'In-store and central production (bakery, fresh): finished/semi-finished/raw material tracking with production costs and efficiency analysis.',
  'm9.t': 'Mobile Warehouse Terminal', 'm9.d': 'Goods receiving, stocktaking, shelf labels and price checks with Android handhelds — warehouse operations in your pocket.',
  'm10.t': 'B2B & e-Invoice', 'm10.d': 'B2B-ready supply chain management: e-invoice integrations with suppliers, order-invoice reconciliation.',
  'm11.t': 'AI Store Operations', 'm11.d': 'AI order and stocktake suggestions, automatic order dispatch to suppliers, and order-verified goods receiving that makes supplier performance measurable.',
  'm12.t': 'BI & Reporting', 'm12.d': 'Direct integration with Bold BI, Power BI and Microsoft 365: deep analytics without changing your reporting culture.',
  'm13.t': 'Asset Purchasing & Tenders', 'm13.d': 'Tender management for fixed-asset purchasing: tender announcements, specification preparation, bid evaluation and purchasing steps — a transparent process bound to approval flows.',
  'm14.t': 'ServiceDesk — Internal Services', 'm14.d': 'A ServiceDesk-based ticket management system: store-level repair, renovation and replacement work, plus consumable orders from the central warehouse — sustainable, traceable process flows.',
  'm15.t': 'Periodic Analysis — AI Executive Assistant', 'm15.d': 'Periodic analysis simplifies the management of your company\'s financial processes. An AI-powered executive assistant module for decision-making, management and fast field operations.',
  'crm.eyebrow': 'CRM Module', 'crm.title': 'A CRM focused on winning customers',
  'crm.lead': 'Know the customer, segment them, convert them with the right campaign. Kalem CRM unifies every channel — point of sale to mobile app — into a single customer view.',
  'crm.b1': '<b>360° customer profile</b> — purchases, campaigns and contact history from all channels on one screen',
  'crm.b2': '<b>End-to-end loyalty</b> — one program integrated across POS terminals, online sales and the Mobile App',
  'crm.b3': '<b>Segmentation management</b> — identify customer behaviour, send targeted offers',
  'crm.b4': '<b>Campaign management</b> — plan centrally, activate instantly across branches',
  'crm.b5': '<b>Automation</b> — birthdays and special days integrate automatically with campaigns',
  'crm.b6': '<b>Coupons</b> — corporate and end-consumer coupon solutions',
  'crm.b7': '<b>AI-assisted customer management</b> with live KPI dashboards',
  'crm.b8': '<b>Call-center integrations</b> — customer service on the same screen as CRM',
  'crm.b9': '<b>ERP integration</b> — bidirectional exchange of variable data with ERPs',
  'crm.b10': '<b>API-based app integrations</b> — ready connections to MilliON and other ecosystem apps',
  'crm.mock.t': 'Customer: Aysel M. · Gold segment', 'crm.mock.r1': 'Last 90 days', 'crm.mock.r2': 'Loyalty balance',
  'crm.mock.r3': 'Birthday campaign', 'crm.mock.r3v': 'Automatic tomorrow',
  'crm.mock.f': 'AI: “A dairy coupon raises return probability 2.3×”',
  'proc.eyebrow': 'Process Management', 'proc.title': 'Run the company on approval flows — from wherever you are',
  'proc.lead': 'From price changes to campaigns, expiry-date control to stocktakes, the entire system is governed by process management. Every critical operation passes through an approval flow — approve from the mobile app on your phone, no office required.',
  'proc.b1': 'Price changes, campaigns, stocktakes and expiry control — all approval-bound',
  'proc.b2': 'Push notification on mobile → approve or reject with one tap',
  'proc.b3': 'Multi-level approval chains by authority level',
  'proc.b4': 'Every step in the audit log — who approved what, and when',
  'proc.mock.t': 'Awaiting approval', 'proc.mock.r1': 'Price change · 34 products', 'proc.mock.a1': 'Branch 5',
  'proc.mock.r2': 'Expiry discount · dairy shelf', 'proc.mock.a2': '−30%',
  'proc.mock.r3': 'Stocktake result · warehouse B', 'proc.mock.a3': 'Variance: 0.4%',
  'proc.mock.ok': '✓ Approve', 'proc.mock.no': '✕ Reject',
  'kboss.title': 'Manage your company with AI',
  'kboss.lead': 'KBoss is the AI-assisted management module built for owners and executives. Ask for reports, assign tasks, track outcomes — all by voice.',
  'kboss.b1': 'Voice AI assistant for reporting: “show me this week\'s branch comparison”',
  'kboss.b2': 'Task management — create tasks by voice, routed automatically to the owner',
  'kboss.b3': 'Live KPIs: revenue, margin, stock turnover, branch performance',
  'kboss.b4': 'Proactive alerts on critical events: anomalies, register variance, stock risk',
  'kboss.mock.q': '“KBoss, compare yesterday\'s revenue by branch”',
  'kboss.mock.a': 'Yesterday: 96,480 ₼ across 12 branches. Branch 7 is 18% above target; Branch 3 has a stock risk in dairy. The report has been emailed to you.',
  'ai.eyebrow': 'AI in Operations', 'ai.title': 'AI-assisted store, ordering and stocktake management',
  'ai.lead': 'Recommendations based on sales velocity, seasonality and stock levels reduce daily workload and make your supply chain measurable.',
  'ai.b1': 'AI order suggestions with <b>automatic dispatch</b> of orders to suppliers',
  'ai.b2': 'AI stocktake suggestions — targeted count plans for risky categories',
  'ai.b3': '<b>Order-verified goods receiving</b>: incoming goods matched to the order automatically',
  'ai.b4': 'So <b>supplier performance</b> is measured objectively: on-time delivery, short/over shipments, price compliance',
  'ai.mock.t': 'Supplier performance · last 30 days', 'ai.mock.ontime': 'on time', 'ai.mock.ontime2': 'on time',
  'ai.mock.f': 'AI: “Move TezSüd orders one day earlier”',
  'int.title': 'Ecosystem integrations', 'int.lead': 'Ready, certified connections to the market\'s leading services.',
  'int1.t': '🏛 Azerbaijan e-Kassa', 'int1.d': 'Certified fiscalization application: sales, refunds, shifts, X/Z reports — fully compliant with tax requirements.',
  'int2.t': '🏦 Leading banks — POS', 'int2.d': 'Card terminal integration with Azerbaijan\'s leading banks: the amount goes from register to terminal, the result is recorded automatically.',
  'int3.t': '🛵 Wolt · Bolt Food · Birmarket', 'int3.d': 'Integration with the market\'s leading delivery platforms: menu/price sync and orders landing directly at the register.',
  'int4.t': '📲 Apple & Android Wallet', 'int4.d': 'Customers no longer carry loyalty cards: the card lives in the phone\'s Wallet, used at the register with one tap. A user-friendly experience.',
  'int5.t': '📊 Bold BI · Power BI · Microsoft 365', 'int5.d': 'Direct integration with your BI and office tools: live data connections, automated report distribution.',
  'int6.t': '🔄 Leading ERPs & API', 'int6.d': 'Variable-data integration with the market\'s leading ERPs — SAP, LOGO, Mikro, 1C, jRetail, Venüt, Microsoft Dynamics 365; API-based ready connections to apps like MilliON.',
  'sec.title': '🔐 Your data is protected to international standards',
  'sec.lead': 'All data is encrypted to international standards. Sensitive information is masked by role, every customer runs in an isolated environment, and every operation is written to the audit log.',
  'sec.b1': 'End-to-end encryption (in transit and at rest)',
  'sec.b2': 'Information hiding: role-based data masking',
  'sec.b3': 'Fully isolated environment per customer',
  'price.eyebrow': 'Corporate quote',
  'price.title': 'Let’s shape the right solution for your business',
  'price.lead': 'We assess your stores, users and operating model, then prepare a tailored proposal for only the modules you need.',
  'price.f1': 'Modules matched to your needs', 'price.f2': 'Licensing that fits your scale', 'price.f3': 'Migration and training plan',
  'price.users': 'Users', 'price.pos': 'POS registers', 'price.mobile': 'Mobile terminals',
  'price.monthly': 'Monthly', 'price.cta': 'Request a quote',
  'buy.cta': 'Buy now', 'buy.title': 'Online subscription',
  'buy.lead': 'After payment your environment is provisioned automatically; credentials are e-mailed to you.',
  'buy.company': 'Company name', 'buy.email': 'E-mail', 'buy.slug': 'Subdomain',
  'buy.pay': 'Proceed to payment', 'buy.err': 'Operation failed. Please retry or contact us:',
  'buy.redirect': 'Redirecting to the bank payment page...',
  'price.note': 'Our team will listen to your needs and present the right solution and implementation plan.',
  'how.title': 'Start in 3 steps',
  'how.s1t': 'Apply', 'how.s1d': 'Fill in the form — our team contacts you to understand your needs.',
  'how.s2t': 'Your environment is provisioned', 'how.s2d': 'A dedicated secure environment is created automatically: <b>you.kalemplatform.com</b>. Your data stays fully isolated.',
  'how.s3t': 'Start selling', 'how.s3d': 'Import your products (CSV/ERP), connect the registers and start selling the same day. Training and 24/7 support included.',
  'c.title': 'Request a demo or quote', 'c.lead': 'Tell us what you need; we will contact you within one business day to shape the right solution together.',
  'c.baku': 'Baku Office (Azerbaijan)', 'c.ist': 'Istanbul Office (Türkiye)', 'c.line': '24/7 support line',
  'c.name': 'Full name', 'c.company': 'Company / Store', 'c.email': 'Email', 'c.phone': 'Phone',
  'c.msg': 'Your message', 'c.send': 'Send',
  'c.mailOpen': 'Opening your email client…', 'c.ok': 'Thanks — we received your request!', 'c.err': 'Could not send; please email us:',
  'footer.tag': 'Since 1989 · Experience from 2,000+ projects',
  'footer.rights': 'All rights reserved',
};

/* Kurumsal güven yenilemesi: doğrulanmış metrikler ve çözüm aileleri. */
Object.assign(I18N.az, {
  'hero.eyebrow': '1989-dan bəri · 2.000+ uğurlu layihə',
  'hero.lead': 'Kalem Platform — 1989-dan bəri sahədə qazanılan təcrübə ilə hazırlanmış, ERP-dən asılı olmadan işləyən pərakəndə idarəetmə mühərrikidir. Kassadan CRM-ə, satınalmadan istehsala və süni intellekt dəstəkli idarəetməyə qədər bütün əməliyyatlarınız tək platformada.',
  'strip.years': 'ildən bəri sektor təcrübəsi',
  'strip.countries': 'tamamlanmış layihə',
  'strip.uptime': 'müstəqil və inteqrasiya edilə bilən',
  'why.lead': '1989-dan bəri 2.000-dən çox layihədə formalaşan təcrübə — pərakəndə komandalarının real ehtiyaclarından doğulmuş vahid idarəetmə platforması.',
  'why6.d': '1989-dan bəri 2.000-dən çox layihədə qazanılan sahə təcrübəsi platformanın hər modulunda.',
  'group.sales': 'Satış və mağaza',
  'group.customer': 'Müştəri və gəlir',
  'group.supply': 'Təchizat və istehsal',
  'group.operations': 'Əməliyyat və proses',
  'group.intelligence': 'Analitika və süni intellekt',
  'price.eyebrow': 'Korporativ təklif',
  'price.title': 'Ehtiyacınıza uyğun həlli birlikdə quraq',
  'price.lead': 'Filial, istifadəçi və əməliyyat modelinizi dəyərləndirək; yalnız ehtiyacınız olan modullar üçün sizə özəl təklif hazırlayaq.',
  'price.f1': 'Ehtiyaca uyğun modullar',
  'price.f2': 'Ölçəyə uyğun lisenziyalaşdırma',
  'price.f3': 'Keçid və təlim planı',
  'price.note': 'Komandamız tələblərinizi dinləyib uyğun həll və tətbiq planını təqdim etsin.',
  'price.cta': 'Təklif al',
  'footer.tag': '1989-dan bəri · 2.000-dən çox layihə təcrübəsi',
});

Object.assign(I18N.tr, {
  'group.sales': 'Satış ve mağaza',
  'group.customer': 'Müşteri ve gelir',
  'group.supply': 'Tedarik ve üretim',
  'group.operations': 'Operasyon ve süreç',
  'group.intelligence': 'Analitik ve yapay zekâ',
});

Object.assign(I18N.en, {
  'group.sales': 'Sales and stores',
  'group.customer': 'Customer and revenue',
  'group.supply': 'Supply and production',
  'group.operations': 'Operations and workflow',
  'group.intelligence': 'Analytics and AI',
});

I18N.az['c.mailOpen'] = 'E-poçt tətbiqiniz açılır…';
I18N.az['c.ok'] = 'Müraciətiniz qəbul edildi, təşəkkürlər!';
I18N.az['c.err'] = 'Göndərilmədi; zəhmət olmasa e-poçtla əlaqə saxlayın:';

const DEFAULTS = {};
document.querySelectorAll('[data-i18n]').forEach((el) => {
  DEFAULTS[el.dataset.i18n] = el.innerHTML;
});

function setLang(lang) {
  document.documentElement.lang = lang;
  localStorage.setItem('kalem_lang', lang);
  document.querySelectorAll('.lang button').forEach((b) =>
    b.classList.toggle('active', b.dataset.lang === lang),
  );
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    el.innerHTML = (I18N[lang] && I18N[lang][key]) || DEFAULTS[key];
  });
}
document.querySelectorAll('.lang button').forEach((b) =>
  b.addEventListener('click', () => setLang(b.dataset.lang)),
);
setLang(localStorage.getItem('kalem_lang') || 'az');

/* Mobil menü */
const burger = document.querySelector('.nav-burger');
const navLinks = document.querySelector('.nav-links');
function setMenu(open) {
  navLinks?.classList.toggle('open', open);
  burger?.setAttribute('aria-expanded', String(open));
}
burger?.addEventListener('click', () => setMenu(!navLinks?.classList.contains('open')));
document.querySelectorAll('.nav-links a').forEach((a) =>
  a.addEventListener('click', () => setMenu(false)),
);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenu(false);
});

/* Teklif CTA'sı formu teklif talebi olarak işaretler. */
document.getElementById('quote-cta')?.addEventListener('click', () => {
  document.getElementById('lead-config').value = 'request=corporate_quote';
});

/* Demo formu */
document.getElementById('lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const lang = document.documentElement.lang;
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.az[k];
  const status = document.getElementById('lead-status');

  if (CONFIG.leadEndpoint) {
    try {
      const res = await fetch(CONFIG.leadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(String(res.status));
      status.textContent = t('c.ok');
      form.reset();
    } catch {
      status.textContent = t('c.err') + ' ' + CONFIG.leadEmail;
    }
    return;
  }
  const body = encodeURIComponent(
    `Ad: ${data.name}\nŞirkət: ${data.company}\nE-poçt: ${data.email}\nTelefon: ${data.phone || '-'}\nKonfiqurasiya: ${data.config || '-'}\n\n${data.message || ''}`,
  );
  status.textContent = t('c.mailOpen');
  window.location.href = `mailto:${CONFIG.leadEmail}?subject=${encodeURIComponent('Kalem Platform — Demo müraciəti: ' + data.company)}&body=${body}`;
});
