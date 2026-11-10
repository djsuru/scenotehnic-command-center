import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CalendarDays, ChevronLeft, ChevronRight, Clock3, ExternalLink, FileText, Mail, MapPin, MessageCircle, Phone, RefreshCw, Save, Users } from '@/lib/icons';
import { useLiveNodes } from '@/hooks/use-live-nodes';
import { getFieldNumber, getFieldValue, getTitle, updateNode, type GenesisNode } from '@/lib/genesis-data';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { STATUS_OPTIONS, statusLabel } from '@/components/crm/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CRM_PROJECT_ID = '3KVpvuU7hRz7hSjv';
type CalendarView = 'month' | 'week' | 'day' | 'year';
const WEEKDAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
const MONTHS = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
const STATUS_TONES: Record<string, string> = {
  'Se califică': 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  Contactat: 'border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  Ofertat: 'border-sky-500/50 bg-sky-500/10 text-sky-800 dark:text-sky-200',
  'Câștigat': 'border-green-700/50 bg-green-700/10 text-green-800 dark:text-green-200',
  Pierdut: 'border-zinc-500/50 bg-zinc-500/10 text-zinc-700 dark:text-zinc-200',
  Nou: 'border-muted-foreground/30 bg-muted text-muted-foreground',
};

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function localDay(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? dayKey(date) : null;
}
function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}
function shiftDate(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}
function mondayOf(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}
function dateInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? `${dayKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '';
}
function dateLabel(value: string | null) {
  if (!value) return 'Nespecificată';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Nespecificată';
}
function field(node: GenesisNode, name: string, fallback = 'Nespecificat') {
  return getFieldValue(node, name)?.trim() || fallback;
}
function leadName(node: GenesisNode) {
  const contact = getTitle(node, 'Nume contact');
  if (contact) return contact;
  const names = [getFieldValue(node, 'Prenume'), getFieldValue(node, 'Nume')].filter((value) => value?.trim());
  return names.join(' ') || 'Solicitare fără nume';
}
function locationLabel(node: GenesisNode) {
  return getFieldValue(node, 'Locație')?.trim() || getFieldValue(node, 'Salon / restaurant')?.trim() || 'Nespecificată';
}
function eventLabel(node: GenesisNode) {
  return `${leadName(node)} – ${field(node, 'Tip eveniment')} – ${locationLabel(node)}`;
}
function eventTooltip(node: GenesisNode) {
  return [leadName(node), dateLabel(getFieldValue(node, 'Data evenimentului')), field(node, 'Tip eveniment'), locationLabel(node), `${getFieldNumber(node, 'Participanți') ?? '—'} invitați`, statusLabel(field(node, 'Status')), field(node, 'Persoana responsabilă'), `${getFieldNumber(node, 'Total ofertă') ?? '—'} lei`].join(' · ');
}
function tone(status: string) {
  return STATUS_TONES[statusLabel(status)] ?? 'border-border bg-muted text-muted-foreground';
}
function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return <Label htmlFor={htmlFor} className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{children}</Label>;
}
function Detail({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-0 border-b border-border/70 py-2"><dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm">{value ?? 'Nespecificat'}</dd></div>;
}
function EventChip({ node, onOpen }: { node: GenesisNode; onOpen: (node: GenesisNode) => void }) {
  return <button type="button" title={eventTooltip(node)} onClick={() => onOpen(node)} className={`min-h-11 w-full min-w-0 rounded-sm border px-2 py-1.5 text-left text-[11px] leading-4 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tone(field(node, 'Status'))}`}><span className="block truncate font-semibold">{eventLabel(node)}</span><span className="mt-0.5 block truncate text-[10px] opacity-75">{dateLabel(getFieldValue(node, 'Data evenimentului'))}</span></button>;
}
function CalendarCell({ date, events, outside, onOpen }: { date: Date; events: GenesisNode[]; outside: boolean; onOpen: (node: GenesisNode) => void }) {
  const today = dayKey(new Date()) === dayKey(date);
  return <div className={`min-h-28 border-b border-r border-border p-1.5 ${outside ? 'bg-muted/20 text-muted-foreground' : 'bg-card'} ${today ? 'ring-1 ring-inset ring-primary/50' : ''}`}><div className="mb-1 flex items-center justify-between"><span className={`font-mono text-[10px] tabular-nums ${today ? 'font-bold text-primary' : ''}`}>{date.getDate()}</span>{events.length ? <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{events.length}</span> : null}</div><div className="grid gap-1">{events.slice(0, 3).map((node) => <EventChip key={node.id} node={node} onOpen={onOpen} />)}{events.length > 3 ? <span className="px-1 text-[9px] text-muted-foreground">+ încă {events.length - 3}</span> : null}</div></div>;
}

function EventDetails({ node, onClose, onSaved, onError }: { node: GenesisNode; onClose: () => void; onSaved: () => Promise<void>; onError: (message: string | null) => void }) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(statusLabel(field(node, 'Status')));
  const [eventDate, setEventDate] = useState(dateInput(getFieldValue(node, 'Data evenimentului')));
  const [followUp, setFollowUp] = useState(dateInput(getFieldValue(node, 'Următorul follow-up')));
  const [notes, setNotes] = useState(getFieldValue(node, 'Notițe client') ?? '');
  const [offerServices, setOfferServices] = useState(getFieldValue(node, 'Servicii selectate') ?? '');
  const [offerValue, setOfferValue] = useState(getFieldValue(node, 'Valoare ofertă') ?? '');
  const [discount, setDiscount] = useState(getFieldValue(node, 'Discount') ?? '');
  const [vat, setVat] = useState(getFieldValue(node, 'TVA (%)') ?? '');
  const [total, setTotal] = useState(getFieldValue(node, 'Total ofertă') ?? '');
  const [offerStatus, setOfferStatus] = useState(getFieldValue(node, 'Status ofertă') ?? '');
  const [offerNotes, setOfferNotes] = useState(getFieldValue(node, 'Notițe ofertă') ?? '');
  const [offerSent, setOfferSent] = useState(dateInput(getFieldValue(node, 'Data trimiterii ofertei')));

  useEffect(() => {
    setStatus(statusLabel(field(node, 'Status')));
    setEventDate(dateInput(getFieldValue(node, 'Data evenimentului')));
    setFollowUp(dateInput(getFieldValue(node, 'Următorul follow-up')));
    setNotes(getFieldValue(node, 'Notițe client') ?? '');
    setOfferServices(getFieldValue(node, 'Servicii selectate') ?? '');
    setOfferValue(getFieldValue(node, 'Valoare ofertă') ?? '');
    setDiscount(getFieldValue(node, 'Discount') ?? '');
    setVat(getFieldValue(node, 'TVA (%)') ?? '');
    setTotal(getFieldValue(node, 'Total ofertă') ?? '');
    setOfferStatus(getFieldValue(node, 'Status ofertă') ?? '');
    setOfferNotes(getFieldValue(node, 'Notițe ofertă') ?? '');
    setOfferSent(dateInput(getFieldValue(node, 'Data trimiterii ofertei')));
  }, [node.id]);

  async function save(fields: Record<string, string | number>) {
    setSaving(true); onError(null);
    try {
      const result = await updateNode(CRM_PROJECT_ID, node.id, fields);
      if (result.ignoredKeys.length) throw new Error(`Unele câmpuri nu s-au salvat: ${result.ignoredKeys.join(', ')}`);
      await onSaved();
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Modificarea nu s-a putut salva.');
      return false;
    } finally { setSaving(false); }
  }
  async function saveStatus() {
    const saved = await save({ Status: status });
    if (saved && status !== 'Se califică') onClose();
  }
  async function saveDate(fieldName: 'Data evenimentului' | 'Următorul follow-up' | 'Data trimiterii ofertei', value: string) {
    if (!value) return onError('Alege o dată înainte să salvezi.');
    await save({ [fieldName]: new Date(value).toISOString() });
  }
  async function saveOffer() {
    const fields: Record<string, string | number> = {};
    if (offerServices.trim()) fields['Servicii selectate'] = offerServices.trim();
    if (offerValue !== '') fields['Valoare ofertă'] = Number(offerValue);
    if (discount !== '') fields.Discount = Number(discount);
    if (vat !== '') fields['TVA (%)'] = Number(vat);
    if (total !== '') fields['Total ofertă'] = Number(total);
    if (offerStatus) fields['Status ofertă'] = offerStatus;
    if (offerNotes.trim()) fields['Notițe ofertă'] = offerNotes.trim();
    if (offerSent) fields['Data trimiterii ofertei'] = new Date(offerSent).toISOString();
    if (!Object.keys(fields).length) return onError('Completează cel puțin un detaliu al ofertei.');
    await save(fields);
  }

  const phone = getFieldValue(node, 'Telefon') ?? '';
  const email = getFieldValue(node, 'Email') ?? '';
  const location = [getFieldValue(node, 'Salon / restaurant'), getFieldValue(node, 'Locație')].filter((value) => value?.trim()).join(' · ') || 'Nespecificată';
  const currency = new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 });
  const currentTotal = getFieldNumber(node, 'Total ofertă');

  return <div className="max-h-[92vh] overflow-y-auto overscroll-contain">
    <DialogHeader className="border-b border-border px-5 py-5 pr-12 sm:px-7"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Fișa evenimentului · CRM</p><DialogTitle className="mt-1 text-2xl tracking-[-0.04em]">{leadName(node)}</DialogTitle><DialogDescription>{eventLabel(node)}</DialogDescription><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline" className={tone(status)}>{status}</Badge><Badge variant="secondary">{field(node, 'Persoana responsabilă')}</Badge></div></DialogHeader>
    <div className="grid gap-6 px-5 py-5 sm:grid-cols-2 sm:px-7">
      <section aria-labelledby="event-contact"><h3 id="event-contact" className="mb-2 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" aria-hidden="true" /> Contact și context</h3><dl><Detail label="Prenume" value={field(node, 'Prenume')} /><Detail label="Nume" value={field(node, 'Nume')} /><Detail label="Companie" value={field(node, 'Companie')} /><Detail label="Telefon" value={phone || 'Nespecificat'} /><Detail label="Email" value={email || 'Nespecificat'} /><Detail label="Sursă" value={field(node, 'Sursă')} /><Detail label="Lead intrat" value={dateLabel(getFieldValue(node, 'Trimis la'))} /><Detail label="Agent responsabil" value={field(node, 'Persoana responsabilă')} /><Detail label="Ultima interacțiune" value={dateLabel(getFieldValue(node, 'Ultima interacțiune'))} /><Detail label="Obiectiv" value={field(node, 'Ce vrei să obții')} /></dl><div className="mt-4 flex flex-wrap gap-2">{phone ? <Button asChild className="min-h-11"><a href={`tel:${phone}`}><Phone aria-hidden="true" /> Sună</a></Button> : null}{email ? <Button asChild variant="outline" className="min-h-11"><a href={`mailto:${email}`}><Mail aria-hidden="true" /> Email</a></Button> : null}{phone ? <Button asChild variant="outline" className="min-h-11"><a href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" /> WhatsApp</a></Button> : null}</div></section>
      <section aria-labelledby="event-data"><h3 id="event-data" className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" /> Detalii eveniment</h3><dl><Detail label="Tip eveniment" value={field(node, 'Tip eveniment')} /><Detail label="Locație" value={location} /><Detail label="Interior / exterior / mix" value={field(node, 'Interior / exterior / mix')} /><Detail label="Invitați" value={getFieldNumber(node, 'Participanți') ?? 'Nespecificat'} /><Detail label="Capacitate locație" value={getFieldNumber(node, 'Capacitate locație') ?? 'Nespecificată'} /></dl><div className="mt-4 grid gap-3"><div className="grid gap-2"><FieldLabel htmlFor="event-date">Data evenimentului</FieldLabel><div className="flex gap-2"><Input id="event-date" type="datetime-local" autoComplete="off" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /><Button type="button" aria-label="Salvează data evenimentului" disabled={saving} onClick={() => void saveDate('Data evenimentului', eventDate)}><Save aria-hidden="true" /></Button></div></div><div className="grid gap-2"><FieldLabel htmlFor="event-status">Status CRM</FieldLabel><div className="flex gap-2"><select id="event-status" className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={status} onChange={(event) => setStatus(event.target.value)}>{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select><Button type="button" aria-label="Salvează statusul CRM" disabled={saving} onClick={() => void saveStatus()}><Save aria-hidden="true" /></Button></div></div></div></section>
      <section className="sm:col-span-2" aria-labelledby="event-followup"><h3 id="event-followup" className="mb-2 flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-4 w-4 text-primary" aria-hidden="true" /> Follow-up și notițe</h3><div className="grid gap-4 md:grid-cols-2"><div className="grid gap-2"><FieldLabel htmlFor="event-follow-up">Următorul follow-up</FieldLabel><div className="flex gap-2"><Input id="event-follow-up" type="datetime-local" autoComplete="off" value={followUp} onChange={(event) => setFollowUp(event.target.value)} /><Button type="button" aria-label="Salvează follow-up" disabled={saving} onClick={() => void saveDate('Următorul follow-up', followUp)}><Save aria-hidden="true" /></Button></div></div><div className="grid gap-2"><FieldLabel htmlFor="event-notes">Notițe client</FieldLabel><Textarea id="event-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notițe despre discuție sau cerințe" /><Button type="button" variant="outline" className="min-h-11" disabled={saving} onClick={() => void save({ 'Notițe client': notes.trim() })}><Save aria-hidden="true" /> Salvează nota</Button></div></div></section>
      <section className="sm:col-span-2" aria-labelledby="event-offer"><h3 id="event-offer" className="mb-2 flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-primary" aria-hidden="true" /> Ofertă</h3><dl className="mb-4 grid gap-x-4 sm:grid-cols-2"><Detail label="Valoare totală curentă" value={currentTotal == null ? 'Nespecificată' : currency.format(currentTotal)} /><Detail label="Status ofertă" value={field(node, 'Status ofertă')} /></dl><div className="grid gap-3 md:grid-cols-2"><div className="grid gap-2 md:col-span-2"><FieldLabel htmlFor="offer-services">Servicii selectate</FieldLabel><Input id="offer-services" value={offerServices} onChange={(event) => setOfferServices(event.target.value)} /></div><div className="grid gap-2"><FieldLabel htmlFor="offer-value">Valoare ofertă (RON)</FieldLabel><Input id="offer-value" type="number" inputMode="decimal" min="0" value={offerValue} onChange={(event) => setOfferValue(event.target.value)} /></div><div className="grid gap-2"><FieldLabel htmlFor="offer-discount">Discount (RON)</FieldLabel><Input id="offer-discount" type="number" inputMode="decimal" min="0" value={discount} onChange={(event) => setDiscount(event.target.value)} /></div><div className="grid gap-2"><FieldLabel htmlFor="offer-vat">TVA (%)</FieldLabel><Input id="offer-vat" type="number" inputMode="decimal" min="0" value={vat} onChange={(event) => setVat(event.target.value)} /></div><div className="grid gap-2"><FieldLabel htmlFor="offer-total">Total ofertă (RON)</FieldLabel><Input id="offer-total" type="number" inputMode="decimal" min="0" value={total} onChange={(event) => setTotal(event.target.value)} /></div><div className="grid gap-2"><FieldLabel htmlFor="offer-status">Status ofertă</FieldLabel><select id="offer-status" className="min-h-11 rounded-md border border-input bg-background px-3 text-sm" value={offerStatus} onChange={(event) => setOfferStatus(event.target.value)}><option value="">Nespecificat</option>{['În lucru', 'Transmisă', 'Acceptată', 'Refuzată', 'Expirată'].map((option) => <option key={option} value={option}>{option}</option>)}</select></div><div className="grid gap-2"><FieldLabel htmlFor="offer-sent">Data trimiterii ofertei</FieldLabel><Input id="offer-sent" type="datetime-local" autoComplete="off" value={offerSent} onChange={(event) => setOfferSent(event.target.value)} /></div><div className="grid gap-2 md:col-span-2"><FieldLabel htmlFor="offer-notes">Notițe ofertă</FieldLabel><Textarea id="offer-notes" rows={2} value={offerNotes} onChange={(event) => setOfferNotes(event.target.value)} /></div></div><Button type="button" className="mt-3 min-h-11" disabled={saving} onClick={() => void saveOffer()}><Save aria-hidden="true" /> Salvează oferta</Button></section>
      <section className="sm:col-span-2 flex flex-wrap gap-3 border-t border-border pt-4"><Button asChild variant="outline" className="min-h-11"><Link to="/crm" onClick={onClose}><ExternalLink aria-hidden="true" /> Deschide leadul în Pipeline</Link></Button><span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><Building2 className="h-4 w-4" aria-hidden="true" /> CRM-ul rămâne sursa unică a evenimentului.</span></section>
    </div>
  </div>;
}

export default function EventCalendarPage() {
  const crm = useLiveNodes(CRM_PROJECT_ID);
  const [view, setView] = useState<CalendarView>('month');
  const [calendarStatus, setCalendarStatus] = useState('Se califică');
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedNode = crm.nodes.find((node) => node.id === selectedId && ['Se califică', 'Ofertat'].includes(statusLabel(getFieldValue(node, 'Status') ?? ''))) ?? null;
  const statusNodes = useMemo(() => crm.nodes.filter((node) => statusLabel(getFieldValue(node, 'Status') ?? '') === calendarStatus), [crm.nodes, calendarStatus]);
  const missingDate = useMemo(() => statusNodes.filter((node) => localDay(getFieldValue(node, 'Data evenimentului')) == null), [statusNodes]);
  const eventTypes = useMemo(() => Array.from(new Set(statusNodes.map((node) => getFieldValue(node, 'Tip eveniment')).filter((value): value is string => Boolean(value?.trim())))).sort((a, b) => a.localeCompare(b, 'ro')), [statusNodes]);
  const events = useMemo(() => statusNodes.filter((node) => {
    const day = localDay(getFieldValue(node, 'Data evenimentului'));
    if (!day || (fromFilter && day < fromFilter) || (toFilter && day > toFilter)) return false;
    if (typeFilter && getFieldValue(node, 'Tip eveniment') !== typeFilter) return false;
    if (agentFilter && !(getFieldValue(node, 'Persoana responsabilă') ?? '').toLocaleLowerCase('ro-RO').includes(agentFilter.toLocaleLowerCase('ro-RO'))) return false;
    const location = `${getFieldValue(node, 'Locație') ?? ''} ${getFieldValue(node, 'Salon / restaurant') ?? ''}`.toLocaleLowerCase('ro-RO');
    if (locationFilter && !location.includes(locationFilter.toLocaleLowerCase('ro-RO'))) return false;
    if (sourceFilter && !(getFieldValue(node, 'Sursă') ?? '').toLocaleLowerCase('ro-RO').includes(sourceFilter.toLocaleLowerCase('ro-RO'))) return false;
    return true;
  }), [statusNodes, fromFilter, toFilter, typeFilter, agentFilter, locationFilter, sourceFilter]);
  const eventMap = useMemo(() => {
    const map = new Map<string, GenesisNode[]>();
    for (const node of events) {
      const day = localDay(getFieldValue(node, 'Data evenimentului'));
      if (day) map.set(day, [...(map.get(day) ?? []), node]);
    }
    return map;
  }, [events]);
  const initial = crm.loading && crm.updatedAt == null;
  const heading = view === 'year' ? String(cursor.getFullYear()) : view === 'month' ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}` : view === 'day' ? new Intl.DateTimeFormat('ro-RO', { dateStyle: 'full' }).format(cursor) : `${dayKey(mondayOf(cursor))} – ${dayKey(shiftDate(mondayOf(cursor), 6))}`;
  const monthDays = useMemo(() => { const start = mondayOf(new Date(cursor.getFullYear(), cursor.getMonth(), 1)); return Array.from({ length: 42 }, (_, index) => shiftDate(start, index)); }, [cursor.getFullYear(), cursor.getMonth()]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => shiftDate(mondayOf(cursor), index)), [cursor]);
  const yearMonths = useMemo(() => Array.from({ length: 12 }, (_, month) => new Date(cursor.getFullYear(), month, 1)), [cursor.getFullYear()]);

  function moveCursor(direction: number) {
    setCursor((current) => {
      const next = new Date(current);
      if (view === 'year') next.setFullYear(current.getFullYear() + direction);
      else if (view === 'month') next.setMonth(current.getMonth() + direction, 1);
      else if (view === 'week') next.setDate(current.getDate() + direction * 7);
      else next.setDate(current.getDate() + direction);
      return next;
    });
  }
  function clearFilters() {
    setTypeFilter(''); setAgentFilter(''); setLocationFilter(''); setSourceFilter(''); setFromFilter(''); setToFilter(''); setCalendarStatus('Se califică');
  }
  async function refreshAfterSave() { await crm.refresh(); setErrorMessage(null); }

  return <div className="min-h-screen bg-background md:pl-[264px]"><CrmSidebar /><main className="min-w-0 px-4 pb-12 pt-5 sm:px-6 lg:px-8">
    <header className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">SCENOTEHNICA / CRM</p><h1 className="mt-1 text-2xl font-semibold tracking-[-0.05em] sm:text-3xl">Event Calendar</h1><p className="mt-1 text-xs text-muted-foreground">Calendarul citește direct leadurile cu status „{calendarStatus}”.</p></div><div className="flex flex-wrap items-center gap-2"><Link to="/crm" className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-xs font-semibold hover:border-primary hover:text-primary"><ExternalLink className="h-4 w-4" aria-hidden="true" /> Pipeline</Link><Button type="button" variant="outline" className="min-h-11 min-w-11" aria-label="Reîncarcă leadurile" onClick={() => void crm.refresh()}><RefreshCw className="h-4 w-4" aria-hidden="true" /></Button></div></div></header>
    {crm.error && crm.updatedAt == null ? <div role="alert" className="mb-5 border border-destructive/40 bg-destructive/5 p-4 text-sm">Nu am putut încărca leadurile CRM. <button type="button" className="font-semibold underline" onClick={() => void crm.refresh()}>Încearcă din nou</button></div> : crm.error ? <p role="status" className="mb-4 text-xs text-muted-foreground">Afișez ultima listă încărcată; actualizarea recentă nu s-a încheiat. <button type="button" className="underline" onClick={() => void crm.refresh()}>Reîncarcă</button></p> : null}
    {errorMessage ? <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{errorMessage}</p> : null}
    <section aria-label="Rezumatul calendarului" className="mb-5 grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-4"><div className="bg-card px-4 py-3"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Leaduri cu status selectat</p><p className="mt-1 text-2xl font-semibold tabular-nums text-primary">{statusNodes.length}</p></div><div className="bg-card px-4 py-3"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">În calendar</p><p className="mt-1 text-2xl font-semibold tabular-nums">{events.length}</p></div><div className="bg-card px-4 py-3"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Fără dată</p><p className="mt-1 text-2xl font-semibold tabular-nums">{missingDate.length}</p></div><div className="bg-card px-4 py-3"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Valoare oferte afișate</p><p className="mt-1 text-lg font-semibold tabular-nums">{new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(events.reduce((sum, node) => sum + (getFieldNumber(node, 'Total ofertă') ?? 0), 0))}</p></div></section>
    {missingDate.length ? <section className="mb-5 border border-amber-500/40 bg-amber-500/5 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">{missingDate.length} leaduri cu statusul „{calendarStatus}” nu au data evenimentului</p><p className="mt-1 text-xs text-muted-foreground">Completează data în lead pentru a-l poziționa automat în calendar.</p></div><Link to="/crm" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-primary underline">Deschide Pipeline <ExternalLink className="h-4 w-4" aria-hidden="true" /></Link></div><div className="mt-3 flex flex-wrap gap-2">{missingDate.slice(0, 4).map((node) => <button type="button" key={node.id} className="min-h-11 border border-border bg-card px-3 text-xs hover:border-primary" onClick={() => setSelectedId(node.id)}>{leadName(node)}</button>)}</div></section> : null}
    <section aria-label="Filtre calendar" className="mb-5 border border-border bg-card p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" aria-hidden="true" /><h2 className="text-sm font-semibold">Filtre</h2><div role="group" aria-label="Status CRM afișat" className="flex flex-wrap gap-1.5">{(['Se califică', 'Ofertat'] as const).map((status) => <button type="button" key={status} aria-pressed={calendarStatus === status} onClick={() => setCalendarStatus(status)} className={`min-h-11 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${calendarStatus === status ? tone(status) : 'border-border bg-background text-muted-foreground hover:border-primary hover:text-primary'}`}>{status}</button>)}</div></div><button type="button" onClick={clearFilters} className="min-h-11 px-3 text-xs font-semibold text-primary underline">Resetează filtrele</button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="grid gap-1.5"><FieldLabel htmlFor="event-from">De la data</FieldLabel><Input id="event-from" type="date" value={fromFilter} onChange={(event) => setFromFilter(event.target.value)} /></div><div className="grid gap-1.5"><FieldLabel htmlFor="event-to">Până la data</FieldLabel><Input id="event-to" type="date" value={toFilter} onChange={(event) => setToFilter(event.target.value)} /></div><div className="grid gap-1.5"><FieldLabel htmlFor="event-type">Tip eveniment</FieldLabel><select id="event-type" className="min-h-11 rounded-md border border-input bg-background px-3 text-sm" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">Toate tipurile</option>{eventTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><div className="grid gap-1.5"><FieldLabel htmlFor="event-agent">Agent responsabil</FieldLabel><Input id="event-agent" value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)} placeholder="Caută agent" autoComplete="off" /></div><div className="grid gap-1.5"><FieldLabel htmlFor="event-location">Locație / salon</FieldLabel><Input id="event-location" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} placeholder="Caută locație" autoComplete="off" /></div><div className="grid gap-1.5"><FieldLabel htmlFor="event-source">Sursă lead</FieldLabel><Input id="event-source" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} placeholder="Caută sursa" autoComplete="off" /></div><div className="flex items-end text-xs text-muted-foreground">{events.length} evenimente potrivite · status: {calendarStatus}</div></div></section>
    <section aria-label="Calendarul evenimentelor" className="overflow-hidden border border-border bg-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"><div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="Perioada anterioară" onClick={() => moveCursor(-1)}><ChevronLeft aria-hidden="true" /></Button><Button type="button" variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="Perioada următoare" onClick={() => moveCursor(1)}><ChevronRight aria-hidden="true" /></Button><Button type="button" variant="outline" className="min-h-11" onClick={() => setCursor(new Date())}>Astăzi</Button><h2 className="ml-2 text-lg font-semibold tracking-[-0.03em]">{heading}</h2></div><div role="group" aria-label="Vizualizare calendar" className="flex flex-wrap gap-1">{(['month', 'week', 'day', 'year'] as CalendarView[]).map((mode) => <button type="button" key={mode} aria-pressed={view === mode} onClick={() => setView(mode)} className={`min-h-11 border px-3 text-[10px] font-bold uppercase tracking-[0.08em] ${view === mode ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}>{({ month: 'Lună', week: 'Săptămână', day: 'Zi', year: 'An' })[mode]}</button>)}</div></div>
      {initial ? <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse bg-muted" />)}</div> : view === 'month' ? <div className="overflow-x-auto"><div className="min-w-[760px]"><div className="grid grid-cols-7 border-b border-border bg-muted/40">{WEEKDAYS.map((weekday) => <div key={weekday} className="px-2 py-2 text-center font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{weekday}</div>)}</div><div className="grid grid-cols-7">{monthDays.map((date) => <CalendarCell key={dayKey(date)} date={date} outside={date.getMonth() !== cursor.getMonth()} events={eventMap.get(dayKey(date)) ?? []} onOpen={(node) => setSelectedId(node.id)} />)}</div></div></div> : view === 'week' ? <div className="overflow-x-auto"><div className="grid min-w-[900px] grid-cols-7">{weekDays.map((date) => <div key={dayKey(date)} className="border-r border-border"><div className="border-b border-border bg-muted/40 px-2 py-3 text-center"><span className="block font-mono text-[9px] uppercase text-muted-foreground">{WEEKDAYS[(date.getDay() + 6) % 7]}</span><span className="mt-1 inline-block font-semibold tabular-nums">{date.getDate()}</span></div><div className="grid min-h-64 content-start gap-2 p-2">{(eventMap.get(dayKey(date)) ?? []).map((node) => <EventChip key={node.id} node={node} onOpen={(item) => setSelectedId(item.id)} />)}</div></div>)}</div></div> : view === 'day' ? <div className="grid gap-px bg-border sm:grid-cols-[minmax(10rem,0.7fr)_2fr]"><div className="bg-muted/30 p-5"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Evenimente în această zi</p><p className="mt-2 text-4xl font-semibold tabular-nums text-primary">{(eventMap.get(dayKey(cursor)) ?? []).length}</p></div><div className="grid content-start gap-2 bg-card p-4">{(eventMap.get(dayKey(cursor)) ?? []).map((node) => <EventChip key={node.id} node={node} onOpen={(item) => setSelectedId(item.id)} />)}{!(eventMap.get(dayKey(cursor)) ?? []).length ? <p className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Niciun eveniment cu statusul selectat în această zi.</p> : null}</div></div> : <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">{yearMonths.map((month) => { const count = events.filter((node) => { const day = localDay(getFieldValue(node, 'Data evenimentului')); if (!day) return false; const date = dateFromKey(day); return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth(); }).length; return <button type="button" key={month.getMonth()} onClick={() => { setCursor(month); setView('month'); }} className="min-h-32 bg-card p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{MONTHS[month.getMonth()]}</span><span className="mt-2 block text-3xl font-semibold tabular-nums">{count}</span><span className="text-xs text-muted-foreground">evenimente în calendar</span></button>; })}</div>}
      {!initial && !events.length ? <p className="border-t border-border p-8 text-center text-sm text-muted-foreground">Nu există evenimente care să corespundă filtrelor selectate.</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"><p className="text-xs text-muted-foreground">Evenimentele sunt leaduri CRM, nu copii; modificările se sincronizează automat.</p><span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300"><RefreshCw className="h-3 w-3" aria-hidden="true" /> Sincronizare activă</span></div>
    </section>
    <Dialog open={selectedNode != null} onOpenChange={(open) => { if (!open) { setSelectedId(null); setErrorMessage(null); } }}><DialogContent className="max-h-[92vh] overflow-y-auto overscroll-contain p-0 sm:max-w-3xl">{selectedNode ? <EventDetails node={selectedNode} onClose={() => setSelectedId(null)} onSaved={refreshAfterSave} onError={setErrorMessage} /> : null}</DialogContent></Dialog>
  </main></div>;
}
