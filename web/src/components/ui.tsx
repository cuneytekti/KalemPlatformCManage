import { ReactNode } from 'react';

export function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" aria-label="Yükleniyor" /></div>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty">
      <div className="empty-mark">K</div>
      <strong>Henüz gösterilecek kayıt yok</strong>
      <span>{message}</span>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
