import { useMemo, useState, type FormEvent } from 'react';
import { ArrowUpRight, Download, FileText, Plus, Printer, RefreshCw, Trash2, X } from '@/lib/icons';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { useLiveNodes } from '@/hooks/use-live-nodes';
import { createNode, getFieldNumber, getFieldValue, getTitle, updateNode, type GenesisNode, type NewNodeFields } from '@/lib/genesis-data';

const CRM_PROJECT_ID = '3KVpvuU7hRz7hSjv';
const OFFER_STATUSES = ['În lucru', 'Transmisă', 'Acceptată', 'Refuzată', 'Expirată'];
const SERVICE_LIBRARY = [
  'Sonorizare completă',
  'Lumini & light show',
  'Ecrane LED & video',
  'Scenă & structuri',
  'Efecte speciale',
  'DJ & entertainment',
  'Suport tehnic',
  'Echipă tehnică',
];
const OFFER_TEMPLATES = [
  { name: 'Format compact', detail: 'Sunet + lumini de bază', services: ['Sonorizare completă', 'Lumini de bază'] },
  { name: 'Format corporate', detail: 'Sunet + lumini + video + suport tehnic', services: ['Sonorizare completă', 'Lumini & light show', 'Ecrane LED & video', 'Suport tehnic'] },
  { name: 'Format premium', detail: 'Scenă + sunet + lumini + LED + echipă', services: ['Scenă & structuri', 'Sonorizare completă', 'Lumini & light show', 'Ecrane LED & video', 'Echipă tehnică'] },
];
const STATUS_TONES: Record<string, string> = {
  'În lucru': 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  'Transmisă': 'border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200',
  'Acceptată': 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  'Refuzată': 'border-destructive/40 bg-destructive/5 text-destructive',
  'Expirată': 'border-border bg-muted text-muted-foreground',
};

function isLeadRecord(node: GenesisNode) {
  return node.parentId == null && !getFieldValue(node, 'Acțiune Command Center') && Boolean(
    getFieldValue(node, 'Nume contact') || getFieldValue(node, 'Email') || getFieldValue(node, 'Telefon'),
  );
}

function isOfferRecord(node: GenesisNode) {
  return node.parentId != null && !getFieldValue(node, 'Acțiune Command Center') && Boolean(getFieldValue(node, 'Status ofertă'));
}

function leadName(node: GenesisNode) {
  return getTitle(node, 'Nume contact', 'Prenume', 'Nume') ?? 'Solicitare fără nume';
}

function leadLocation(node: GenesisNode) {
  return getFieldValue(node, 'Locație')?.trim() || getFieldValue(node, 'Salon / restaurant')?.trim() || 'Nespecificată';
}

function displayDate(value: string | null) {
  if (!value) return 'Nespecificată';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('ro-RO', { dateStyle: 'long' }).format(date)
    : value;
}

function offerDateValue(value: string | null) {
  if (!value?.trim()) return null;
  const clean = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? `${clean}T00:00:00.000Z` : clean;
}

type ServiceLine = { name: string; quantity: string; unitPrice: string };
type OfferWriteFields = Record<string, string | number | boolean>;

function parseAmount(value: string) {
  if (!value.trim()) return null;
  const amount = Number(value.replace(',', '.'));
  return Number.isFinite(amount) ? amount : null;
}

function parseServices(value: string | null): ServiceLine[] {
  if (!value?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((line): line is { name: string; quantity?: unknown; unitPrice?: unknown } => typeof line === 'object' && line !== null && 'name' in line && typeof line.name === 'string').map((line) => ({
        name: line.name,
        quantity: String(line.quantity ?? 1),
        unitPrice: String(line.unitPrice ?? ''),
      }));
    }
  } catch {
    return [{ name: value, quantity: '1', unitPrice: '' }];
  }
  return [{ name: value, quantity: '1', unitPrice: '' }];
}

function dateInputValue(value: string | null) {
  if (!value?.trim()) return '';
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : '';
}

function dateTimeLocalValue(value: string | null) {
  if (!value?.trim()) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function serviceSummary(value: string | null) {
  const lines = parseServices(value);
  return lines.length
    ? lines.map((line) => `${line.name} · ${line.quantity} × ${line.unitPrice || 'preț de completat'}`).join(' · ')
    : value ?? '';
}

function addText(fields: OfferWriteFields, key: string, value: string | null) {
  if (value?.trim()) fields[key] = value.trim();
}

function setOfferDetails(
  fields: OfferWriteFields,
  status: string,
  services: ServiceLine[],
  subtotal: number,
  discountAmount: number,
  discountType: 'fix' | 'percent',
  discountPercent: number,
  vat: string,
  total: number,
  sentDate: string,
  validUntil: string,
  followUp: string,
  owner: string,
  commercialTerms: string,
  notes: string,
  versionGroup: string,
  versionNumber: number,
) {
  fields['Status ofertă'] = status;
  fields['Servicii selectate'] = JSON.stringify(services.map((line) => ({
    name: line.name.trim(),
    quantity: parseAmount(line.quantity) ?? 0,
    unitPrice: parseAmount(line.unitPrice) ?? 0,
  })));
  fields['Valoare ofertă'] = subtotal;
  fields.Discount = discountAmount;
  fields['Tip discount'] = discountType === 'percent' ? 'Procentual' : 'Fix';
  fields['Procent discount'] = discountPercent;
  fields['TVA (%)'] = parseAmount(vat) ?? 21;
  fields['Total ofertă'] = total;
  fields['Grup versiuni ofertă'] = versionGroup;
  fields['Versiune ofertă'] = versionNumber;
  const dateValue = offerDateValue(sentDate);
  if (dateValue) fields['Data trimiterii ofertei'] = dateValue;
  const expiryValue = offerDateValue(validUntil);
  if (expiryValue) fields['Valabilă până la data'] = expiryValue;
  if (followUp) fields['Următorul follow-up'] = new Date(followUp).toISOString();
  addText(fields, 'Persoana responsabilă', owner);
  addText(fields, 'Condiții comerciale', commercialTerms);
  addText(fields, 'Notițe ofertă', notes);
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string | number | Array<string | number> }) {
  return <label htmlFor={htmlFor} className="block font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{children}</label>;
}

function Value({ label, children }: { label: string; children: string }) {
  return <div className="min-w-0 border-b border-border/70 py-3"><dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm">{children || 'Nespecificat'}</dd></div>;
}

function offerField(offer: GenesisNode, lead: GenesisNode | null, field: string) {
  return getFieldValue(offer, field)?.trim() || (lead ? getFieldValue(lead, field)?.trim() : '') || '';
}

function formatOfferAmount(value: number | null) {
  return value == null ? 'Necompletat' : value.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function followUpTaskTitle(offerId: string) {
  return `Follow-up ofertă · ${offerId}`;
}

export default function OffersPage() {
  const crm = useLiveNodes(CRM_PROJECT_ID);
  const leads = useMemo(() => crm.nodes.filter(isLeadRecord), [crm.nodes]);
  const offers = useMemo(
    () => crm.nodes.filter(isOfferRecord).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    [crm.nodes],
  );
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [status, setStatus] = useState('În lucru');
  const [services, setServices] = useState<ServiceLine[]>([]);
  const [serviceChoice, setServiceChoice] = useState(SERVICE_LIBRARY[0]);
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<'fix' | 'percent'>('fix');
  const [vat, setVat] = useState('21');
  const [sentDate, setSentDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [owner, setOwner] = useState('');
  const [commercialTerms, setCommercialTerms] = useState('');
  const [notes, setNotes] = useState('');
  const subtotal = useMemo(() => services.reduce((sum, line) => {
    const quantity = parseAmount(line.quantity) ?? 0;
    const unitPrice = parseAmount(line.unitPrice) ?? 0;
    return sum + quantity * unitPrice;
  }, 0), [services]);
  const hasUnpricedServices = services.some((line) => !line.name.trim() || parseAmount(line.quantity) == null || parseAmount(line.unitPrice) == null);
  const discountInput = parseAmount(discount) ?? 0;
  const discountAmount = Math.round((discountType === 'percent' ? subtotal * discountInput / 100 : discountInput) * 100) / 100;
  const discountPercent = discountType === 'percent' ? discountInput : 0;
  const total = Math.round(((subtotal - discountAmount) * (1 + (parseAmount(vat) ?? 21) / 100) + Number.EPSILON) * 100) / 100;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pdfOfferId, setPdfOfferId] = useState<string | null>(null);

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? null;
  const selectedOffer = offers.find((offer) => offer.id === selectedOfferId) ?? null;
  const createsNewVersion = selectedOffer != null && ['Transmisă', 'Acceptată'].includes(getFieldValue(selectedOffer, 'Status ofertă') ?? '');
  const pdfOffer = offers.find((offer) => offer.id === pdfOfferId) ?? null;
  const pdfLead = pdfOffer ? leads.find((lead) => lead.id === pdfOffer.parentId) ?? null : null;
  const pdfServices = pdfOffer ? parseServices(getFieldValue(pdfOffer, 'Servicii selectate')) : [];
  const pdfSubtotal = pdfOffer ? getFieldNumber(pdfOffer, 'Valoare ofertă') ?? pdfServices.reduce((sum, line) => sum + (parseAmount(line.quantity) ?? 0) * (parseAmount(line.unitPrice) ?? 0), 0) : 0;
  const leadOffers = offers.filter((offer) => offer.parentId === selectedLeadId);
  const initial = crm.loading && crm.updatedAt == null;

  function resetOffer() {
    setSelectedOfferId(null);
    setStatus('În lucru');
    setServices([]);
    setDiscount('');
    setDiscountType('fix');
    setVat('21');
    setSentDate('');
    setValidUntil('');
    setFollowUp('');
    setOwner('');
    setCommercialTerms('');
    setNotes('');
    setError(null);
    setNotice(null);
  }

  function chooseLead(leadId: string) {
    setSelectedLeadId(leadId);
    resetOffer();
  }

  function editOffer(offer: GenesisNode) {
    const protectedStatus = ['Transmisă', 'Acceptată'].includes(getFieldValue(offer, 'Status ofertă') ?? '');
    setSelectedOfferId(offer.id);
    setSelectedLeadId(offer.parentId ?? '');
    setStatus(protectedStatus ? 'În lucru' : getFieldValue(offer, 'Status ofertă') ?? 'În lucru');
    setServices(parseServices(getFieldValue(offer, 'Servicii selectate')));
    const storedDiscountType = getFieldValue(offer, 'Tip discount');
    const usesPercent = storedDiscountType === 'Procentual' || storedDiscountType === 'percent';
    setDiscountType(usesPercent ? 'percent' : 'fix');
    setDiscount(usesPercent ? getFieldNumber(offer, 'Procent discount')?.toString() ?? '' : getFieldNumber(offer, 'Discount')?.toString() ?? '');
    setVat(getFieldNumber(offer, 'TVA (%)')?.toString() ?? '21');
    setSentDate(dateInputValue(getFieldValue(offer, 'Data trimiterii ofertei')));
    setValidUntil(dateInputValue(getFieldValue(offer, 'Valabilă până la data')));
    setFollowUp(dateTimeLocalValue(getFieldValue(offer, 'Următorul follow-up')));
    setOwner(getFieldValue(offer, 'Persoana responsabilă') ?? '');
    setCommercialTerms(getFieldValue(offer, 'Condiții comerciale') ?? '');
    setNotes(getFieldValue(offer, 'Notițe ofertă') ?? '');
    setError(null);
    setNotice(protectedStatus ? 'Versiunea transmisă rămâne nemodificată. Salvarea va crea o versiune nouă în lucru.' : null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLead || saving) return;
    if (hasUnpricedServices) {
      setError('Completează un preț pentru fiecare serviciu înainte de salvare. Nu am introdus tarife implicite.');
      return;
    }
    if (discountInput < 0 || (discountType === 'percent' && discountInput > 100) || discountAmount > subtotal) {
      setError('Verifică discountul: procentul trebuie să fie între 0 și 100, iar reducerea nu poate depăși subtotalul.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    let offerSaved = false;
    let offerId = selectedOffer?.id ?? null;
    let saveNotice = '';

    try {
      const versionGroup = selectedOffer
        ? getFieldValue(selectedOffer, 'Grup versiuni ofertă') || selectedOffer.id
        : crypto.randomUUID();
      const versionNumber = createsNewVersion
        ? Math.max(0, ...offers.filter((item) => item.id === versionGroup || getFieldValue(item, 'Grup versiuni ofertă') === versionGroup).map((item) => getFieldNumber(item, 'Versiune ofertă') ?? 0)) + 1
        : selectedOffer ? getFieldNumber(selectedOffer, 'Versiune ofertă') ?? 1 : 1;
      const offerFields: OfferWriteFields = {};
      setOfferDetails(offerFields, status, services, subtotal, discountAmount, discountType, discountPercent, vat, total, sentDate, validUntil, followUp, owner, commercialTerms, notes, versionGroup, versionNumber);

      if (selectedOffer && !createsNewVersion) {
        const result = await updateNode(CRM_PROJECT_ID, selectedOffer.id, offerFields);
        if (result.ignoredKeys.length > 0) throw new Error(`Câmpuri nerecunoscute, oferta nu a fost actualizată: ${result.ignoredKeys.join(', ')}.`);
        offerSaved = true;
        offerId = selectedOffer.id;
        saveNotice = 'Oferta a fost actualizată. Leadul nu a fost modificat.';
      } else {
        const fields: NewNodeFields = {
          parentId: selectedLead.id,
          '/text': `Ofertă · ${leadName(selectedLead)} · v${versionNumber}`,
          'Status ofertă': status,
        };
        const source = selectedOffer ?? selectedLead;
        addText(fields, 'Nume contact', offerField(source, selectedLead, 'Nume contact'));
        addText(fields, 'Email', offerField(source, selectedLead, 'Email'));
        addText(fields, 'Telefon', offerField(source, selectedLead, 'Telefon'));
        addText(fields, 'Companie', offerField(source, selectedLead, 'Companie'));
        addText(fields, 'Tip eveniment', offerField(source, selectedLead, 'Tip eveniment'));
        addText(fields, 'Data evenimentului', offerDateValue(offerField(source, selectedLead, 'Data evenimentului')));
        addText(fields, 'Locație', offerField(source, selectedLead, 'Locație') || leadLocation(selectedLead));
        const participants = getFieldNumber(source, 'Participanți') ?? getFieldNumber(selectedLead, 'Participanți');
        if (participants != null) fields.Participanți = participants;
        setOfferDetails(fields, status, services, subtotal, discountAmount, discountType, discountPercent, vat, total, sentDate, validUntil, followUp, owner, commercialTerms, notes, versionGroup, versionNumber);

        const result = await createNode(CRM_PROJECT_ID, fields);
        if (result.ignoredKeys.length > 0) throw new Error(`Câmpuri nerecunoscute, oferta nu a fost creată: ${result.ignoredKeys.join(', ')}.`);
        offerSaved = true;
        offerId = result.id;
        if (result.id) setSelectedOfferId(result.id);
        saveNotice = createsNewVersion
          ? `Versiunea ${versionNumber} a fost creată în lucru. Oferta transmisă inițial a rămas nemodificată.`
          : 'Oferta a fost creată separat și asociată leadului selectat. Leadul nu a fost modificat.';
      }

      let followUpWarning = '';
      if (followUp && offerId) {
        try {
          const taskTitle = followUpTaskTitle(versionGroup);
          const existingTask = crm.nodes.find((node) => node.parentId === selectedLead.id && getFieldValue(node, 'Acțiune Command Center') === 'Follow-up' && getTitle(node) === taskTitle);
          if (existingTask) {
            const result = await updateNode(CRM_PROJECT_ID, existingTask.id, {
              'Termen Command Center': new Date(followUp).toISOString(),
              'Persoana responsabilă': owner.trim(),
            });
            if (result.ignoredKeys.length > 0) throw new Error(`Câmpuri ignorate: ${result.ignoredKeys.join(', ')}.`);
          } else {
            const task: NewNodeFields = {
              parentId: selectedLead.id,
              '/text': taskTitle,
              'Acțiune Command Center': 'Follow-up',
              'Termen Command Center': new Date(followUp).toISOString(),
              'Prioritate Command Center': 'Normal',
              'Status task Command Center': 'De făcut',
              'Status lead la generare': getFieldValue(selectedLead, 'Status') ?? '',
              'Generat la': new Date().toISOString(),
            };
            addText(task, 'Persoana responsabilă', owner);
            const result = await createNode(CRM_PROJECT_ID, task);
            if (result.ignoredKeys.length > 0) throw new Error(`Câmpuri ignorate: ${result.ignoredKeys.join(', ')}.`);
          }
        } catch (followUpError) {
          followUpWarning = ` Oferta s-a salvat, dar activitatea de follow-up nu s-a putut sincroniza cu Command Center: ${followUpError instanceof Error ? followUpError.message : 'eroare necunoscută'}`;
        }
      }
      await crm.refresh();
      setNotice(`${saveNotice}${followUpWarning}${!followUp && selectedOffer ? ' Eliminarea datei din ofertă nu anulează activități Command Center deja create.' : ''}`);
    } catch (saveError) {
      setError(offerSaved
        ? `Oferta s-a salvat, dar reîmprospătarea listei nu s-a finalizat: ${saveError instanceof Error ? saveError.message : 'reîncarcă datele.'}`
        : saveError instanceof Error ? saveError.message : 'Oferta nu a putut fi salvată. Încearcă din nou.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background md:pl-[264px]">
      <CrmSidebar />
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
          <header className="border-b border-border pb-6">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Vânzări / CRM / Oferta</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.06em] sm:text-4xl">Oferte legate de leaduri.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Alege o solicitare existentă. Datele clientului și evenimentului se preiau din CRM, iar fiecare ofertă se salvează separat.</p>
              </div>
              <span className="inline-flex min-h-11 items-center gap-2 border border-border px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"><FileText className="h-4 w-4 text-primary" aria-hidden="true" /> {offers.length} oferte înregistrate</span>
            </div>
          </header>

          {crm.error && crm.updatedAt != null ? <p role="status" className="mt-5 flex flex-wrap items-center gap-2 border border-border bg-muted/40 p-3 text-xs text-muted-foreground"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Ultima actualizare nu s-a finalizat. <button type="button" onClick={() => void crm.refresh()} className="min-h-11 font-semibold text-primary underline">Reîncarcă</button></p> : null}
          {error ? <p role="alert" className="mt-5 border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
          {notice ? <p role="status" className="mt-5 border border-primary/30 bg-primary/5 p-3 text-sm">{notice}</p> : null}

          {initial ? (
            <section aria-label="Se încarcă leadurile și ofertele" className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="h-72 animate-pulse border border-border bg-muted" />
              <div className="h-72 animate-pulse border border-border bg-muted" />
            </section>
          ) : crm.error && crm.updatedAt == null ? (
            <section role="alert" className="mt-6 border border-destructive/40 bg-destructive/5 p-6">
              <h2 className="font-semibold">Leadurile nu s-au încărcat.</h2>
              <p className="mt-2 text-sm text-muted-foreground">Reîncarcă datele CRM pentru a putea selecta o solicitare existentă.</p>
              <button type="button" onClick={() => void crm.refresh()} className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Reîncarcă leadurile</button>
            </section>
          ) : (
            <div className="mt-6 grid items-start gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="border border-border bg-card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
                  <div><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-primary">1 / Solicitare</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">Selectează un lead existent</h2></div>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{leads.length} leaduri</span>
                </div>
                {leads.length === 0 ? (
                  <p className="mt-4 border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">Nu există leaduri CRM disponibile. Ofertele nu creează solicitări noi.</p>
                ) : (
                  <div className="mt-4">
                    <FieldLabel htmlFor="offer-lead">Lead CRM</FieldLabel>
                    <select id="offer-lead" value={selectedLeadId} onChange={(event) => chooseLead(event.target.value)} className="mt-2 min-h-11 w-full border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Alege o solicitare</option>
                      {leads.map((lead) => <option key={lead.id} value={lead.id}>{leadName(lead)} · {getFieldValue(lead, 'Tip eveniment') || 'Eveniment nespecificat'}</option>)}
                    </select>
                  </div>
                )}

                {selectedLead ? (
                  <div className="mt-5 border-t border-border pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Date preluate din lead</p><h3 className="mt-1 text-lg font-semibold">{leadName(selectedLead)}</h3></div>
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-primary"><ArrowUpRight className="h-3 w-3" aria-hidden="true" /> CRM</span>
                    </div>
                    <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
                      <Value label="Companie">{getFieldValue(selectedLead, 'Companie') ?? ''}</Value>
                      <Value label="Email">{getFieldValue(selectedLead, 'Email') ?? ''}</Value>
                      <Value label="Telefon">{getFieldValue(selectedLead, 'Telefon') ?? ''}</Value>
                      <Value label="Tip eveniment">{getFieldValue(selectedLead, 'Tip eveniment') ?? ''}</Value>
                      <Value label="Data evenimentului">{displayDate(getFieldValue(selectedLead, 'Data evenimentului'))}</Value>
                      <Value label="Locație">{leadLocation(selectedLead)}</Value>
                      <Value label="Participanți">{getFieldNumber(selectedLead, 'Participanți')?.toLocaleString('ro-RO') ?? ''}</Value>
                    </dl>
                    <p className="mt-4 border-l-2 border-primary/50 pl-3 text-xs leading-5 text-muted-foreground">Aceste date sunt preluate automat și salvate ca instantaneu pe fiecare ofertă nouă. Leadul original rămâne neatins.</p>
                  </div>
                ) : null}
              </section>

              <section className="border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                  <div><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-primary">2 / Ofertă</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">{selectedOffer ? 'Editează oferta' : 'Înregistrează o ofertă'}</h2></div>
                  {selectedLead ? <button type="button" onClick={resetOffer} className="min-h-11 border border-border px-3 text-xs font-semibold hover:border-primary hover:text-primary">Ofertă nouă</button> : null}
                </div>
                {!selectedLead ? (
                  <p className="mt-4 border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">Selectează mai întâi un lead. O ofertă va fi asociată acelui lead, nu va crea un lead nou.</p>
                ) : (
                  <form onSubmit={(event) => void handleSave(event)} className="mt-4 space-y-4">
                    <div>
                      <FieldLabel htmlFor="offer-status">Status ofertă</FieldLabel>
                      <select id="offer-status" value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 min-h-11 w-full border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {OFFER_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </div>
                    <section className="border border-border/70 p-4">
                      <div>
                        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">Șabloane editabile, fără tarife presetate</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          {OFFER_TEMPLATES.map((template) => <button key={template.name} type="button" onClick={() => setServices(template.services.map((name) => ({ name, quantity: '1', unitPrice: '' })))} className="min-h-20 border border-border p-3 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <span className="block text-sm font-semibold">{template.name}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{template.detail}</span>
                          </button>)}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Șablonul doar completează serviciile. Cantitățile și prețurile trebuie confirmate și editate pentru eveniment.</p>
                      </div>
                      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-border/70 pt-4">
                        <div className="min-w-0 flex-1"><FieldLabel htmlFor="service-library">Bibliotecă servicii</FieldLabel><div className="mt-2 flex flex-wrap gap-2"><select id="service-library" value={serviceChoice} onChange={(event) => setServiceChoice(event.target.value)} className="min-h-11 min-w-0 flex-1 border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{SERVICE_LIBRARY.map((service) => <option key={service} value={service}>{service}</option>)}</select><button type="button" onClick={() => setServices((current) => [...current, { name: serviceChoice, quantity: '1', unitPrice: '' }])} className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-xs font-semibold transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="h-4 w-4" aria-hidden="true" /> Adaugă din bibliotecă</button></div></div>
                        <button type="button" onClick={() => setServices((current) => [...current, { name: '', quantity: '1', unitPrice: '' }])} className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-xs font-semibold transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="h-4 w-4" aria-hidden="true" /> Serviciu manual</button>
                      </div>
                      <div className="mt-4">
                        <FieldLabel htmlFor="service-name-0">Servicii selectate</FieldLabel><p className="mt-1 text-xs text-muted-foreground">Editează fiecare denumire, cantitate și preț unitar pentru acest eveniment.</p>
                      </div>
                      {services.length === 0 ? <p className="mt-4 border border-dashed border-border p-3 text-xs text-muted-foreground">Niciun serviciu adăugat încă.</p> : <div className="mt-4 space-y-3">
                        {services.map((line, index) => <div key={index} className="grid items-end gap-3 border-t border-border/70 pt-3 sm:grid-cols-[minmax(0,1fr)_7rem_9rem_2.75rem]">
                          <div><FieldLabel htmlFor={`service-name-${index}`}>Denumire serviciu</FieldLabel><input id={`service-name-${index}`} value={line.name} onChange={(event) => setServices((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} autoComplete="off" required placeholder="Ex. Sonorizare completă" className="mt-2 min-h-11 w-full border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
                          <div><FieldLabel htmlFor={`service-quantity-${index}`}>Cantitate</FieldLabel><input id={`service-quantity-${index}`} type="number" inputMode="decimal" min="0.01" step="0.01" value={line.quantity} onChange={(event) => setServices((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} required className="mt-2 min-h-11 w-full border border-input bg-background px-3 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
                          <div><FieldLabel htmlFor={`service-price-${index}`}>Preț unitar</FieldLabel><input id={`service-price-${index}`} type="number" inputMode="decimal" min="0" step="0.01" value={line.unitPrice} onChange={(event) => setServices((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unitPrice: event.target.value } : item))} required className="mt-2 min-h-11 w-full border border-input bg-background px-3 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
                          <button type="button" aria-label={`Elimină serviciul ${index + 1}`} onClick={() => setServices((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex min-h-11 min-w-11 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                        </div>)}
                      </div>}
                      <div className="mt-4 flex items-center justify-between border-t border-border pt-3"><span className="text-sm font-medium">Valoare ofertă · subtotal servicii</span><output className="font-mono text-sm font-semibold tabular-nums">{subtotal.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</output></div>
                    </section>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><FieldLabel htmlFor="offer-discount-type">Tip discount</FieldLabel><select id="offer-discount-type" value={discountType} onChange={(event) => setDiscountType(event.target.value as 'fix' | 'percent')} className="mt-2 min-h-11 w-full border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="fix">Sumă fixă</option><option value="percent">Procentual</option></select></div>
                      <div><FieldLabel htmlFor="offer-discount">Discount {discountType === 'percent' ? '(%)' : '(sumă)'}</FieldLabel><input id="offer-discount" type="number" inputMode="decimal" min="0" max={discountType === 'percent' ? '100' : undefined} step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} className="mt-2 min-h-11 w-full border border-input bg-background px-3 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
                      <div><FieldLabel htmlFor="offer-vat">TVA (%)</FieldLabel><input id="offer-vat" type="number" inputMode="decimal" min="0" step="0.01" value={vat} onChange={(event) => setVat(event.target.value)} className="mt-2 min-h-11 w-full border border-input bg-background px-3 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
                      <div><FieldLabel htmlFor="offer-total">Total ofertă cu TVA</FieldLabel><input id="offer-total" type="text" readOnly value={hasUnpricedServices ? 'Completează prețurile' : formatOfferAmount(total)} className="mt-2 min-h-11 w-full border border-input bg-background px-3 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
                      <div><FieldLabel htmlFor="offer-sent-date">Data trimiterii ofertei</FieldLabel><input id="offer-sent-date" type="date" value={sentDate} onChange={(event) => setSentDate(event.target.value)} className="mt-2 min-h-11 w-full border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
                      <div><FieldLabel htmlFor="offer-valid-until">Valabilă până la</FieldLabel><input id="offer-valid-until" type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className="mt-2 min-h-11 w-full border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
                      <div><FieldLabel htmlFor="offer-follow-up">Revenire planificată</FieldLabel><input id="offer-follow-up" type="datetime-local" value={followUp} onChange={(event) => setFollowUp(event.target.value)} className="mt-2 min-h-11 w-full border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
                      <div><FieldLabel htmlFor="offer-owner">Responsabil</FieldLabel><input id="offer-owner" value={owner} onChange={(event) => setOwner(event.target.value)} autoComplete="name" placeholder="Numele responsabilului" className="mt-2 min-h-11 w-full border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
                    </div>
                    <p className="text-xs text-muted-foreground">Reducere calculată: {formatOfferAmount(discountAmount)}{discountType === 'percent' ? ` (${discountPercent}%)` : ''}. Nu sunt setate tarife implicite.</p>
                    <div>
                      <FieldLabel htmlFor="offer-terms">Condiții comerciale</FieldLabel>
                      <textarea id="offer-terms" value={commercialTerms} onChange={(event) => setCommercialTerms(event.target.value)} rows={3} placeholder="Condiții de plată, montaj, transport sau alte prevederi convenite" className="mt-2 min-h-24 w-full resize-y border border-input bg-background px-3 py-2 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <div>
                      <FieldLabel htmlFor="offer-notes">Notițe ofertă</FieldLabel>
                      <textarea id="offer-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Detalii și observații pentru această ofertă" className="mt-2 min-h-24 w-full resize-y border border-input bg-background px-3 py-2 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">Totalul păstrează formula existentă: (subtotal servicii minus reducerea efectivă) × (1 + TVA). Totalul se salvează doar după completarea tuturor prețurilor.</p>
                    <button type="submit" disabled={saving || hasUnpricedServices || services.length === 0} className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Se salvează…' : createsNewVersion ? 'Creează versiune nouă' : selectedOffer ? 'Salvează modificările ofertei' : 'Salvează oferta separată'}</button>
                  </form>
                )}
              </section>

              <section className="border border-border bg-card p-4 sm:col-span-2 sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
                  <div><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-primary">Istoric asociat</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">{selectedLead ? `Oferte pentru ${leadName(selectedLead)}` : 'Oferte înregistrate'}</h2></div>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{selectedLead ? leadOffers.length : offers.length} înregistrări</span>
                </div>
                {(selectedLead ? leadOffers : offers).length === 0 ? (
                  <p className="mt-4 border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">{selectedLead ? 'Acest lead nu are încă oferte separate. Înregistrează prima ofertă din formularul de mai sus.' : 'Nu există încă oferte separate. Selectează un lead pentru a începe.'}</p>
                ) : (
                  <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(selectedLead ? leadOffers : offers).map((offer) => {
                      const parentLead = leads.find((lead) => lead.id === offer.parentId);
                      const offerStatus = getFieldValue(offer, 'Status ofertă') ?? 'În lucru';
                      return <li key={offer.id} className="min-w-0 border border-border/80 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><p className="truncate text-sm font-semibold">{getTitle(offer) ?? 'Ofertă'}</p><p className="mt-1 truncate text-xs text-muted-foreground">{parentLead ? leadName(parentLead) : 'Lead asociat indisponibil'}</p></div>
                          <span className={`shrink-0 rounded-full border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] ${STATUS_TONES[offerStatus] ?? 'border-border bg-muted text-muted-foreground'}`}>{offerStatus}</span>
                        </div>
                        <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">{serviceSummary(getFieldValue(offer, 'Servicii selectate')) || getFieldValue(offer, 'Notițe ofertă') || 'Fără servicii sau notițe completate.'}</p>
                        <p className="mt-2 font-mono text-xs tabular-nums text-foreground">Total salvat: {getFieldNumber(offer, 'Total ofertă')?.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) ?? 'necompletat'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Versiunea {getFieldNumber(offer, 'Versiune ofertă') ?? 1}{getFieldValue(offer, 'Valabilă până la data') ? ` · valabilă până la ${displayDate(getFieldValue(offer, 'Valabilă până la data'))}` : ''}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={() => editOffer(offer)} className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Deschide oferta <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
                          <button type="button" onClick={() => setPdfOfferId(offer.id)} className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-xs font-semibold transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><FileText className="h-4 w-4" aria-hidden="true" /> Generează PDF</button>
                        </div>
                      </li>;
                    })}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
        {pdfOffer ? (
          <div className="offer-pdf-overlay fixed inset-0 z-[100] overflow-y-auto bg-background/90 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-labelledby="offer-pdf-title" onKeyDown={(event) => { if (event.key === 'Escape') setPdfOfferId(null); }}>
            <style>{`@page { size: A4; margin: 0; } @media print { body * { visibility: hidden !important; } .offer-pdf-overlay, .offer-pdf-overlay * { visibility: visible !important; } .offer-pdf-overlay { position: absolute !important; inset: 0 !important; display: block !important; overflow: visible !important; padding: 0 !important; background: #fff !important; backdrop-filter: none !important; } .offer-pdf-controls { display: none !important; } .offer-pdf-preview { width: 210mm !important; min-height: 297mm !important; margin: 0 !important; padding: 16mm !important; border: 0 !important; box-shadow: none !important; } }`}</style>
            <div className="offer-pdf-controls sticky top-0 z-10 mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
              <div className="min-w-0"><h2 id="offer-pdf-title" className="text-sm font-semibold">Previzualizare ofertă</h2><p className="mt-1 text-xs text-muted-foreground">Oferta selectată · {pdfOffer.id}</p></div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Download className="h-4 w-4" aria-hidden="true" /> Salvează PDF</button>
                <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 min-w-11 items-center justify-center border border-border px-3 text-xs font-semibold hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Tipărește oferta"><Printer className="h-4 w-4" aria-hidden="true" /></button>
                <button type="button" onClick={() => setPdfOfferId(null)} className="inline-flex min-h-11 min-w-11 items-center justify-center border border-border text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Închide previzualizarea"><X className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            </div>
            <article className="offer-pdf-preview mx-auto min-h-[297mm] w-full max-w-[210mm] border border-border bg-white p-7 text-zinc-900 shadow-2xl sm:p-12" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
              <header className="flex items-start justify-between gap-6 border-b-2 border-[#df402f] pb-6">
                <div className="min-w-0">
                  <img src="https://files.taskade.com/space-files/098512e6-44a7-4264-acc2-74e6c8352dbc/original/scenotehnica%20sigla%20in%20pdf.jpg.png" alt="Scenotehnica" className="mb-5 h-12 max-w-[190px] object-contain object-left" />
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-[#df402f]">Producție tehnică pentru evenimente</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ofertă personalizată</h1>
                  <p className="mt-2 text-xs text-zinc-600">Sunet · Lumini · Video · Scenă</p>
                </div>
                <div className="max-w-[38%] text-right">
                  <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-zinc-500">Referință ofertă</p>
                  <p className="mt-1 break-all font-mono text-[10px] text-zinc-800">{pdfOffer.id}</p>
                  <p className="mt-4 inline-flex border border-zinc-300 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]">{getFieldValue(pdfOffer, 'Status ofertă') ?? 'În lucru'}</p>
                  <p className="mt-2 text-[10px] text-zinc-600">Versiunea {getFieldNumber(pdfOffer, 'Versiune ofertă') ?? 1}</p>
                  {getFieldValue(pdfOffer, 'Valabilă până la data') ? <p className="mt-1 text-[10px] text-zinc-600">Valabilă până la {displayDate(getFieldValue(pdfOffer, 'Valabilă până la data'))}</p> : null}
                </div>
              </header>

              <section className="mt-7 grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
                <div>
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-[#df402f]">Client</p>
                  <p className="mt-2 font-semibold">{offerField(pdfOffer, pdfLead, 'Nume contact') || [offerField(pdfOffer, pdfLead, 'Prenume'), offerField(pdfOffer, pdfLead, 'Nume')].filter(Boolean).join(' ') || 'Nespecificat'}</p>
                  <p className="mt-1 text-xs text-zinc-600">{offerField(pdfOffer, pdfLead, 'Companie') || 'Companie nespecificată'}</p>
                  <p className="mt-1 break-words text-xs text-zinc-600">{offerField(pdfOffer, pdfLead, 'Email') || 'Email nespecificat'}</p>
                  <p className="mt-1 text-xs text-zinc-600">{offerField(pdfOffer, pdfLead, 'Telefon') || 'Telefon nespecificat'}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-[#df402f]">Eveniment</p>
                  <p className="mt-2 font-semibold">{offerField(pdfOffer, pdfLead, 'Tip eveniment') || 'Tip nespecificat'}</p>
                  <p className="mt-1 text-xs text-zinc-600">Data: {displayDate(offerField(pdfOffer, pdfLead, 'Data evenimentului') || null)}</p>
                  <p className="mt-1 text-xs text-zinc-600">Locație: {offerField(pdfOffer, pdfLead, 'Locație') || offerField(pdfOffer, pdfLead, 'Salon / restaurant') || 'Nespecificată'}</p>
                  <p className="mt-1 text-xs text-zinc-600">Participanți: {getFieldNumber(pdfOffer, 'Participanți') ?? (pdfLead ? getFieldNumber(pdfLead, 'Participanți') : null) ?? 'Nespecificat'}</p>
                </div>
              </section>

              <section className="mt-8">
                <h2 className="border-b border-zinc-300 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em]">Servicii propuse</h2>
                <table className="mt-2 w-full border-collapse text-left text-xs">
                  <thead><tr className="border-b border-zinc-200 text-[9px] uppercase tracking-[0.08em] text-zinc-500"><th className="py-3 pr-2 font-semibold">Serviciu</th><th className="px-2 py-3 text-right font-semibold">Cant.</th><th className="px-2 py-3 text-right font-semibold">Preț unitar</th><th className="py-3 pl-2 text-right font-semibold">Valoare</th></tr></thead>
                  <tbody>{pdfServices.length ? pdfServices.map((line, index) => {
                    const quantity = parseAmount(line.quantity) ?? 0;
                    const unitPrice = parseAmount(line.unitPrice) ?? 0;
                    return <tr key={`${line.name}-${index}`} className="border-b border-zinc-200"><td className="py-3 pr-2 font-medium">{line.name || 'Serviciu'}</td><td className="px-2 py-3 text-right tabular-nums">{line.quantity}</td><td className="px-2 py-3 text-right tabular-nums">{formatOfferAmount(parseAmount(line.unitPrice))}</td><td className="py-3 pl-2 text-right tabular-nums">{parseAmount(line.unitPrice) == null ? 'Nedisponibil' : formatOfferAmount(quantity * unitPrice)}</td></tr>;
                  }) : <tr className="border-b border-zinc-200"><td colSpan={4} className="py-4 text-zinc-500">Serviciile nu sunt completate în această ofertă.</td></tr>}</tbody>
                </table>
              </section>

              <section className="mt-7 ml-auto w-full max-w-sm space-y-3 text-sm">
                <div className="flex justify-between gap-4 text-zinc-600"><span>Subtotal servicii</span><span className="font-mono tabular-nums text-zinc-900">{formatOfferAmount(pdfSubtotal)}</span></div>
                <div className="flex justify-between gap-4 text-zinc-600"><span>Discount {getFieldValue(pdfOffer, 'Tip discount') === 'Procentual' ? `(${getFieldNumber(pdfOffer, 'Procent discount') ?? 0}%)` : '(sumă fixă)'}</span><span className="font-mono tabular-nums text-zinc-900">{formatOfferAmount(getFieldNumber(pdfOffer, 'Discount'))}</span></div>
                <div className="flex justify-between gap-4 text-zinc-600"><span>TVA ({getFieldNumber(pdfOffer, 'TVA (%)') ?? 21}%)</span><span className="font-mono tabular-nums text-zinc-900">Conform ofertei</span></div>
                <div className="flex justify-between gap-4 border-t-2 border-[#df402f] pt-3 text-base font-semibold"><span>Total ofertă</span><span className="font-mono tabular-nums">{formatOfferAmount(getFieldNumber(pdfOffer, 'Total ofertă'))}</span></div>
              </section>

              {getFieldValue(pdfOffer, 'Condiții comerciale') ? <section className="mt-8 border-t border-zinc-200 pt-4"><h2 className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-[#df402f]">Condiții comerciale</h2><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-zinc-700">{getFieldValue(pdfOffer, 'Condiții comerciale')}</p></section> : null}
              {getFieldValue(pdfOffer, 'Notițe ofertă') ? <section className="mt-5 border-t border-zinc-200 pt-4"><h2 className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-[#df402f]">Note</h2><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-zinc-700">{getFieldValue(pdfOffer, 'Notițe ofertă')}</p></section> : null}
              <footer className="mt-12 border-t border-zinc-200 pt-4 text-xs text-zinc-600">
                <p className="font-semibold text-zinc-900">SCENOTEHNICA.RO</p>
                <p className="mt-1">0721 259 407 · office@Scenotehnica.ro</p>
                <p className="mt-1">Sunet · Lumini · Video · Scenă · Producție tehnică</p>
              </footer>
            </article>
            <p className="offer-pdf-controls mx-auto mt-3 w-full max-w-[210mm] text-center text-xs text-muted-foreground">În fereastra de tipărire, alege „Salvează ca PDF” pentru a descărca documentul.</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
