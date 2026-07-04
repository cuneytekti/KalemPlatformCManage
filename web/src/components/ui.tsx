export function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" aria-label="Yükleniyor" /></div>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="empty">{message}</div>;
}
