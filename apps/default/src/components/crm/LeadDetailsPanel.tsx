import { useEffect, useState } from 'react';
import { getFieldNumber, getFieldValue, getTitle, type GenesisNode } from '@/lib/genesis-data';
import { Mail, Phone, UsersRound } from '@/lib/icons';
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { STATUS_OPTIONS, statusLabel } from '@/components/crm/status';

const EDITABLE_STATUS_OPTIONS = STATUS_OPTIONS.filter((option) => option !== 'Câștigat');

type LeadDetailsPanelProps = {
  node: GenesisNode;
  onStatus: (node: GenesisNode, status: string) => Promise<void>;
  onInteraction: (node: GenesisNode, fields: Record<string, string>) => Promise<void>;
};

function dateLabel(value: string | null) {
  if (!value) return 'Nespecificată';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function dateTimeLabel(value: string | null) {
  if (!value) return 'Nicio interacțiune înregistrată';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function dateTimeInputValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-border py-3 last:border-b-0">
      <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default function LeadDetailsPanel({ node, onStatus, onInteraction }: LeadDetailsPanelProps) {
  const name = getTitle(node, 'Nume contact') ?? 'Solicitare fără nume';
  const email = getFieldValue(node, 'Email') ?? '';
  const phone = getFieldValue(node, 'Telefon') ?? '';
  const eventType = getFieldValue(node, 'Tip eveniment') ?? 'Nespecificat';
  const eventDate = getFieldValue(node, 'Data evenimentului');
  const location = getFieldValue(node, 'Locație') ?? 'Nespecificată';
  const company = getFieldValue(node, 'Companie') ?? 'Nespecificată';
  const source = getFieldValue(node, 'Sursă') ?? 'Nespecificată';
  const submitted = getFieldValue(node, 'Trimis la');
  const participants = getFieldNumber(node, 'Participanți');
  const objective = getFieldValue(node, 'Ce vrei să obții') ?? 'Nicio notă adăugată.';
  const status = statusLabel(getFieldValue(node, 'Status') ?? 'Nou');
  const lastInteractionValue = getFieldValue(node, 'Ultima interacțiune', '/attributes/@05e05');
  const responsibleValue = getFieldValue(node, 'Persoana responsabilă', '/attributes/@c8470') ?? '';
  const [lastInteraction, setLastInteraction] = useState(() => dateTimeInputValue(lastInteractionValue));
  const [responsible, setResponsible] = useState(responsibleValue);
  const [savingInteraction, setSavingInteraction] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [interactionMessage, setInteractionMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const hasInteractionValues = lastInteraction !== '' || responsible.trim() !== '';

  useEffect(() => {
    setLastInteraction(dateTimeInputValue(lastInteractionValue));
    setResponsible(responsibleValue);
  }, [lastInteractionValue, responsibleValue]);

  async function saveInteraction() {
    if (!hasInteractionValues) return;
    setSavingInteraction(true);
    setInteractionMessage('');
    const fields: Record<string, string> = {};
    if (lastInteraction !== '') fields['Ultima interacțiune'] = new Date(lastInteraction).toISOString();
    if (responsible.trim() !== '') fields['Persoana responsabilă'] = responsible.trim();
    try {
      await onInteraction(node, fields);
      setInteractionMessage('Detaliile au fost salvate.');
    } catch {
      setInteractionMessage('Salvarea nu a reușit. Verifică datele și încearcă din nou.');
    } finally {
      setSavingInteraction(false);
    }
  }

  async function changeStatus(nextStatus: string) {
    setSavingStatus(true);
    setStatusMessage('');
    try {
      await onStatus(node, nextStatus);
      setStatusMessage('Statusul a fost actualizat.');
    } catch {
      setStatusMessage('Statusul nu a putut fi actualizat. Încearcă din nou.');
    } finally {
      setSavingStatus(false);
    }
  }

  const details = [
    { label: 'Companie', value: company },
    { label: 'Tip eveniment', value: eventType },
    { label: 'Data evenimentului', value: dateLabel(eventDate) },
    { label: 'Locația evenimentului', value: location },
    { label: 'Sursă', value: source },
    { label: 'Trimis la', value: dateTimeLabel(submitted) },
    { label: 'Participanți', value: participants == null ? 'Nespecificați' : String(participants) },
    { label: 'Obiectivul clientului', value: objective },
    { label: 'Ultima interacțiune', value: dateTimeLabel(lastInteractionValue) },
    { label: 'Persoana responsabilă', value: responsibleValue || 'Nealocat' },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SheetHeader className="shrink-0 border-b border-border px-5 pb-5 pr-14 pt-8 text-left sm:px-6 sm:pr-14">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-primary">Răspunsuri din formular</p>
        <SheetTitle className="mt-2 break-words text-2xl font-semibold tracking-[-0.04em]">{name}</SheetTitle>
        <SheetDescription className="break-all text-xs">{email || 'Email nespecificat'} · {phone || 'Telefon nespecificat'}</SheetDescription>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-sm border border-border bg-muted px-2 py-1 text-[10px] font-semibold">{status}</span>
          <span className="text-xs text-muted-foreground">{company}</span>
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
        <section aria-labelledby="lead-contact-heading">
          <h3 id="lead-contact-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Date de contact</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <a href={email ? `mailto:${email}` : undefined} className="inline-flex min-h-11 min-w-0 items-center gap-2 border border-border px-3 text-xs text-foreground hover:border-primary hover:text-primary" aria-label={email ? `Trimite email către ${email}` : 'Email nespecificat'}>
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="truncate">{email || 'Email nespecificat'}</span>
            </a>
            <a href={phone ? `tel:${phone}` : undefined} className="inline-flex min-h-11 min-w-0 items-center gap-2 border border-border px-3 text-xs text-foreground hover:border-primary hover:text-primary" aria-label={phone ? `Sună la ${phone}` : 'Telefon nespecificat'}>
              <Phone className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="truncate">{phone || 'Telefon nespecificat'}</span>
            </a>
          </div>
        </section>

        <section className="mt-6" aria-labelledby="lead-event-heading">
          <h3 id="lead-event-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Detalii solicitării</h3>
          <dl className="mt-2">
            {details.map((detail) => <Detail key={detail.label} label={detail.label} value={detail.value} />)}
          </dl>
        </section>

        <section className="mt-6 border-t border-border pt-5" aria-labelledby="lead-status-heading">
          <h3 id="lead-status-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Etapa solicitării</h3>
          <label className="mt-3 grid gap-2 text-xs font-medium">
            <span>Status actual</span>
            <select value={status} disabled={savingStatus} onChange={(event) => void changeStatus(event.target.value)} className="min-h-11 border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {!EDITABLE_STATUS_OPTIONS.includes(status) ? <option value={status} disabled={status === 'Câștigat'}>{status}</option> : null}
              {EDITABLE_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          {statusMessage ? <p role="status" className="mt-2 text-xs text-muted-foreground">{statusMessage}</p> : null}
        </section>

        <section className="mt-6 border-t border-border pt-5" aria-labelledby="lead-followup-heading">
          <div className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-primary" aria-hidden="true" /><h3 id="lead-followup-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Urmărire client</h3></div>
          <form onSubmit={(event) => { event.preventDefault(); void saveInteraction(); }} className="mt-4 grid gap-4">
            <label className="grid gap-2 text-xs font-medium">
              <span>Data și ora ultimei interacțiuni</span>
              <input type="datetime-local" value={lastInteraction} onChange={(event) => setLastInteraction(event.target.value)} className="min-h-11 min-w-0 border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
            </label>
            <label className="grid gap-2 text-xs font-medium">
              <span>Persoana responsabilă</span>
              <input type="text" autoComplete="name" value={responsible} onChange={(event) => setResponsible(event.target.value)} placeholder="Numele persoanei" className="min-h-11 min-w-0 border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
            </label>
            <button type="submit" disabled={!hasInteractionValues || savingInteraction} className="min-h-11 bg-primary px-4 text-xs font-bold uppercase tracking-[0.08em] text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
              {savingInteraction ? 'Se salvează…' : 'Salvează detaliile'}
            </button>
            {interactionMessage ? <p role="status" className="text-xs text-muted-foreground">{interactionMessage}</p> : null}
          </form>
        </section>
      </div>
    </div>
  );
}
