import { FormEvent, useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Mail, MapPin, MessageSquareText, Phone, Send, Users, X } from 'lucide-react';
import { useToast } from './Toast';
import { Spinner } from './ui';
import { api, Quote, QuoteActivity, QuoteActivityType, QuoteLanguage, QuoteStatus } from '../lib/api';

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Taslak', SENT: 'Teklif gönderildi', FOLLOW_UP: 'Takip ediliyor', MEETING: 'Görüşme yapıldı',
  NEGOTIATION: 'Müzakere', ACCEPTED: 'Kabul edildi', REJECTED: 'Reddedildi',
};

const ACTIVITY_LABELS: Record<QuoteActivityType, string> = {
  EMAIL_SENT: 'Teklif e-postası', PHONE_CALL: 'Telefon görüşmesi', VISIT: 'Müşteri ziyareti',
  MEETING: 'Toplantı / görüşme', NOTE: 'Genel not', STATUS_CHANGE: 'Durum değişikliği',
};

const ACTIVITY_ICONS: Record<QuoteActivityType, React.ReactNode> = {
  EMAIL_SENT: <Mail size={16} />, PHONE_CALL: <Phone size={16} />, VISIT: <MapPin size={16} />,
  MEETING: <Users size={16} />, NOTE: <MessageSquareText size={16} />, STATUS_CHANGE: <CheckCircle2 size={16} />,
};

const EMAIL_PREVIEW: Record<QuoteLanguage, { title: string; greeting: string; paragraphs: string[]; regards: string; team: string }> = {
  az: {
    title: 'Kalem Platform qiymət təklifiniz hazırdır', greeting: 'Hörmətli',
    paragraphs: [
      'Görüşümüzə əsasən hazırladığımız qiymət təklifini əlavə olaraq diqqətinizə təqdim edirik.',
      'Əməkdaşlığımızın xeyirli olmasını arzulayır, dəyərli rəyinizi gözləyirik.',
      'Hər hansı sual və ya müraciətiniz üçün telefon nömrəmiz və ya veb-saytımız vasitəsilə bizimlə əlaqə saxlaya bilərsiniz.',
    ], regards: 'Hörmətlə,', team: 'Kalem Yazılım komandası',
  },
  tr: {
    title: 'Kalem Platform fiyat teklifiniz hazır', greeting: 'Sayın',
    paragraphs: [
      'Görüşmemize istinaden hazırladığımız fiyat teklifimizi ekte bilgilerinize sunarız.',
      'İş birliğimizin hayırlı olmasını temenni eder, değerli görüşlerinizi bekleriz.',
      'Her türlü soru ve talebiniz için telefon numaramız veya web sitemiz üzerinden bizimle iletişime geçebilirsiniz.',
    ], regards: 'Saygılarımızla,', team: 'Kalem Yazılım Ekibi',
  },
  en: {
    title: 'Your Kalem Platform price proposal is ready', greeting: 'Dear',
    paragraphs: [
      'Please find attached the price proposal we prepared following our meeting.',
      'We hope this will be the beginning of a successful partnership and look forward to your valuable feedback.',
      'For any questions or assistance, please contact us by phone or through our website.',
    ], regards: 'Kind regards,', team: 'The Kalem Yazılım Team',
  },
};

function useModalBehavior(onClose: () => void, busy: boolean) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); };
  }, [busy, onClose]);
}

export function QuoteEmailModal({ quote, onClose, onSent }: { quote: Quote; onClose: () => void; onSent: () => void }) {
  const [lang, setLang] = useState<QuoteLanguage>(quote.sentLanguage ?? 'az');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const copy = EMAIL_PREVIEW[lang];
  const contact = quote.contactName?.trim() || quote.customerName;
  useModalBehavior(onClose, busy);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      await api.quotes.send(quote.id, lang);
      toast.success(`${quote.quoteNumber} numaralı teklif ${quote.contactEmail} adresine gönderildi`);
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  }

  return <div className="form-modal-backdrop" onMouseDown={() => !busy && onClose()}>
    <div className="form-modal email-send-modal" role="dialog" aria-modal="true" aria-labelledby="quote-email-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="form-modal-header"><div><span className="page-eyebrow">Kurumsal gönderim</span><h3 id="quote-email-title">Teklifi e-postayla gönder</h3><p>Alıcıyı ve dili kontrol edin; PDF ve e-posta içeriği aynı dilde hazırlanır.</p></div><button className="modal-close" type="button" onClick={onClose} disabled={busy} aria-label="Gönderim penceresini kapat"><X size={18} /></button></div>
      <form onSubmit={submit}><div className="form-modal-body email-modal-body">
        <div className="email-send-controls">
          <div><span>Alıcı</span><strong>{quote.contactEmail || 'E-posta adresi bulunmuyor'}</strong><small>{contact} · {quote.quoteNumber}</small></div>
          <label>Dil<select value={lang} onChange={(event) => setLang(event.target.value as QuoteLanguage)}><option value="az">Azərbaycanca</option><option value="tr">Türkçe</option><option value="en">English</option></select></label>
        </div>
        <article className="email-preview" aria-label="E-posta içeriği önizlemesi">
          <header><div className="email-preview-brand"><span>K</span><div><strong>Kalem Yazılım</strong><small>Kurumsal Teknoloji Çözümleri</small></div></div><em>{quote.quoteNumber}</em><h4>{copy.title}</h4></header>
          <div className="email-preview-content"><p className="email-preview-recipient">{copy.greeting} {contact},</p>{copy.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<div className="email-preview-attachment"><span>PDF</span><div><strong>{lang === 'az' ? 'Kalem_Platform_Qiymet_Teklifi.pdf' : lang === 'tr' ? 'Kalem_Platform_Fiyat_Teklifi.pdf' : 'Kalem_Platform_Price_Proposal.pdf'}</strong><small>Kurumsal teklif eki</small></div></div><p>{copy.regards}<br /><strong>{copy.team}</strong></p><footer><strong>Kalem Yazılım MMC</strong><span>+994 12 526 22 22 · info@kalemyazilim.az</span><span>www.kalemyazilim.az · Heydər Əliyev prospekti 105-N, Bakı</span></footer></div>
        </article>
        {error && <p className="error">{error}</p>}
      </div><div className="form-modal-footer"><p><Mail size={14} /> Gönderim başarılı olunca süreç “Teklif gönderildi” olur.</p><div className="button-row"><button className="ghost" type="button" onClick={onClose} disabled={busy}>Vazgeç</button><button type="submit" disabled={busy || !quote.contactEmail}><Send size={15} /> {busy ? 'Gönderiliyor…' : 'PDF ile Gönder'}</button></div></div></form>
    </div>
  </div>;
}

function localDateTimeValue() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function QuoteProcessModal({ quote, onClose, onChanged }: { quote: Quote; onClose: () => void; onChanged: () => void }) {
  const [activities, setActivities] = useState<QuoteActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [type, setType] = useState<QuoteActivityType>('PHONE_CALL');
  const [status, setStatus] = useState<QuoteStatus>(quote.status === 'DRAFT' ? 'FOLLOW_UP' : quote.status);
  const [currentStatus, setCurrentStatus] = useState<QuoteStatus>(quote.status);
  const [note, setNote] = useState('');
  const [activityAt, setActivityAt] = useState(localDateTimeValue());
  const toast = useToast();
  useModalBehavior(onClose, busy);

  const load = () => {
    setLoading(true);
    void api.quotes.activities(quote.id).then(setActivities).catch((err) => setError(err instanceof Error ? err.message : String(err))).finally(() => setLoading(false));
  };
  useEffect(load, [quote.id]);

  function changeType(value: QuoteActivityType) {
    setType(value);
    if (value === 'PHONE_CALL' || value === 'VISIT') setStatus('FOLLOW_UP');
    if (value === 'MEETING') setStatus('MEETING');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const activity = await api.quotes.addActivity(quote.id, { type, status, note: note.trim(), activityAt: new Date(activityAt).toISOString() });
      if (activity.status) setCurrentStatus(activity.status);
      toast.success('Teklif süreç kaydı eklendi');
      setNote(''); setActivityAt(localDateTimeValue()); load(); onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }

  return <div className="form-modal-backdrop" onMouseDown={() => !busy && onClose()}>
    <div className="form-modal process-modal" role="dialog" aria-modal="true" aria-labelledby="quote-process-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="form-modal-header"><div><span className="page-eyebrow">Satış süreci</span><h3 id="quote-process-title">{quote.customerName}</h3><p>{quote.quoteNumber} · Tüm temasları ve teklif durumunu kronolojik olarak takip edin.</p></div><button className="modal-close" type="button" onClick={onClose} disabled={busy} aria-label="Süreç penceresini kapat"><X size={18} /></button></div>
      <div className="process-layout">
        <section className="process-entry"><h4>Yeni süreç kaydı</h4><form onSubmit={submit}><label>İşlem türü<select value={type} onChange={(event) => changeType(event.target.value as QuoteActivityType)}><option value="PHONE_CALL">Telefon görüşmesi</option><option value="VISIT">Müşteri ziyareti</option><option value="MEETING">Toplantı / görüşme</option><option value="NOTE">Genel not</option><option value="STATUS_CHANGE">Yalnız durum değişikliği</option></select></label><label>Süreç durumu<select value={status} onChange={(event) => setStatus(event.target.value as QuoteStatus)}><option value="DRAFT">Taslak</option><option value="SENT">Teklif gönderildi</option><option value="FOLLOW_UP">Takip ediliyor</option><option value="MEETING">Görüşme yapıldı</option><option value="NEGOTIATION">Müzakere</option><option value="ACCEPTED">Kabul edildi</option><option value="REJECTED">Reddedildi</option></select></label><label>İşlem tarihi<input type="datetime-local" required value={activityAt} onChange={(event) => setActivityAt(event.target.value)} /></label><label>Görüşme / süreç notu<textarea required minLength={2} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Görüşülen konuları, müşteri geri bildirimini ve sonraki adımı yazın…" /></label>{error && <p className="error">{error}</p>}<button type="submit" disabled={busy || note.trim().length < 2}><CalendarClock size={15} /> {busy ? 'Kaydediliyor…' : 'Sürece Ekle'}</button></form></section>
        <section className="process-timeline"><div className="process-timeline-heading"><h4>Süreç geçmişi</h4><span className={`badge ${currentStatus}`}>{STATUS_LABELS[currentStatus]}</span></div>{loading ? <Spinner /> : activities.length === 0 ? <div className="process-empty"><MessageSquareText size={24} /><p>Henüz süreç kaydı bulunmuyor.</p></div> : <ol>{activities.map((activity) => <li key={activity.id}><div className="timeline-icon">{ACTIVITY_ICONS[activity.type]}</div><div><div className="timeline-title"><strong>{ACTIVITY_LABELS[activity.type]}</strong>{activity.status && <span className={`badge ${activity.status}`}>{STATUS_LABELS[activity.status]}</span>}</div><p>{activity.note}</p><small>{new Date(activity.activityAt).toLocaleString('tr-TR')}{activity.createdByEmail ? ` · ${activity.createdByEmail}` : ''}</small></div></li>)}</ol>}</section>
      </div>
    </div>
  </div>;
}

export { STATUS_LABELS };
