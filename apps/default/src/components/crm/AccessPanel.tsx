import { useState } from 'react';
import { Check, UsersRound } from '@/lib/icons';
import type { AccessRecord } from '@/components/crm/access';

type AccessPanelProps = {
  records: AccessRecord[];
  onActivate: (record: AccessRecord, nextAccess: string) => Promise<void>;
};

export default function AccessPanel({ records, onActivate }: AccessPanelProps) {
  const sales = records.filter((record) => record.role === 'Vânzări');
  const [saving, setSaving] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function changeAccess(record: AccessRecord) {
    const nextAccess = record.access === 'Activ' ? 'Blocat' : 'Activ';
    setSaving(record.node.id);
    setMessage(null);
    try {
      await onActivate(record, nextAccess);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Starea accesului nu a putut fi salvată.');
    } finally {
      setSaving(null);
    }
  }

  async function copyLink(record: AccessRecord) {
    try {
      const link = `${window.location.origin}/activate/${record.token}`;
      await navigator.clipboard.writeText(link);
      setCopied(record.node.id);
      window.setTimeout(() => setCopied(null), 1800);
      setMessage(null);
    } catch {
      setMessage('Linkul nu a putut fi copiat. Verifică permisiunile clipboardului.');
    }
  }

  return (
    <section aria-labelledby="access-management-title" className="border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3 text-primary">
        <UsersRound className="h-5 w-5" aria-hidden="true" />
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em]">Administrare acces</p>
      </div>
      <h2 id="access-management-title" className="mt-4 text-2xl font-semibold tracking-[-0.05em]">Cei 5 utilizatori Vânzări</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Fiecare slot are un link unic. Trimite linkul colegului, aprobă accesul și blochează-l oricând.</p>
      {message ? <p role="alert" className="mt-4 border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">{message}</p> : null}
      {sales.length ? (
        <div className="mt-6 grid gap-3">
          {sales.map((record) => (
            <div key={record.node.id} className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{record.name}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Rol: {record.role} · {record.access}</p>
              </div>
              <button type="button" disabled={!record.token} onClick={() => void copyLink(record)} className="inline-flex min-h-11 items-center justify-center gap-2 border border-border px-4 text-xs font-bold uppercase tracking-[0.1em] text-foreground disabled:opacity-50">
                {copied === record.node.id ? 'Copiat' : 'Copiază linkul'}
              </button>
              <button type="button" disabled={saving === record.node.id} onClick={() => void changeAccess(record)} className="inline-flex min-h-11 items-center justify-center gap-2 bg-foreground px-4 text-xs font-bold uppercase tracking-[0.1em] text-background disabled:opacity-50">
                <Check className="h-4 w-4" aria-hidden="true" /> {record.access === 'Activ' ? 'Blochează' : 'Activează'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p role="status" className="mt-6 border border-dashed border-border p-4 text-sm text-muted-foreground">Nu există utilizatori cu rolul Vânzări în directorul de acces.</p>
      )}
    </section>
  );
}
