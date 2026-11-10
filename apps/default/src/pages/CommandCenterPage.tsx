import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CircleAlert, Clock3, FileText, Phone, RefreshCw, RotateCcw, Sparkles } from '@/lib/icons';
import { useLiveNodes } from '@/hooks/use-live-nodes';
import { createNode, getFieldValue, getTitle, updateNode, type GenesisNode } from '@/lib/genesis-data';
import CrmSidebar from '@/components/crm/CrmSidebar';

const CRM_PROJECT_ID = '3KVpvuU7hRz7hSjv';
type ActionKind = 'De sunat' | 'De ofertat' | 'Follow-up';
type TaskStatus = 'De făcut' | 'În lucru' | 'Finalizat' | 'Nu s-a putut realiza';
const ACTION_BY_STATUS: Record<string, ActionKind | undefined> = {
  Nou: 'De sunat',
  Contactat: 'De ofertat',
  Ofertat: 'Follow-up',
};
const PRIORITY_ORDER: Record<string, number> = { Urgent: 0, Important: 1, Normal: 2 };
const TASK_STATES: TaskStatus[] = ['De făcut', 'În lucru', 'Finalizat', 'Nu s-a putut realiza'];

function localDay(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDay(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return localDay(date);
}

function getDayLabel(day: string, today: string) {
  if (day === today) return 'ASTĂZI';
  if (day === shiftDay(today, -1)) return 'IERI';
  if (day === shiftDay(today, 1)) return 'MÂINE';
  return new Date(`${day}T12:00:00`).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' });
}

function fieldDay(node: GenesisNode, field: string) {
  const value = getFieldValue(node, field);
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : localDay(parsed);
}

function leadName(node: GenesisNode) {
  return getTitle(node, 'Nume contact') ?? getFieldValue(node, 'Email') ?? 'Solicitare fără nume';
}

function priorityFor(lead: GenesisNode, today: string) {
  const eventDay = fieldDay(lead, 'Data evenimentului');
  if (eventDay && eventDay <= shiftDay(today, 7)) return 'Urgent';
  const submitted = getFieldValue(lead, 'Trimis la');
  if (submitted && Date.now() - new Date(submitted).getTime() > 24 * 60 * 60 * 1000) return 'Urgent';
  if (eventDay && eventDay <= shiftDay(today, 30)) return 'Important';
  return 'Normal';
}

function isLead(node: GenesisNode) {
  const isAction = Boolean(getFieldValue(node, 'Acțiune Command Center'));
  const hasIdentity = Boolean(getFieldValue(node, 'Nume contact') || getFieldValue(node, 'Email') || getFieldValue(node, 'Telefon'));
  return !isAction && hasIdentity;
}

function isClosed(node: GenesisNode) {
  const state = getFieldValue(node, 'Status task Command Center');
  return state === 'Finalizat' || state === 'Nu s-a putut realiza';
}

function Metric({ label, value, tone = 'text-foreground' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="min-w-0 border-r border-border px-4 py-4 last:border-r-0 sm:px-5">
      <p className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-[-0.06em] tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function PriorityBadge({ value }: { value: string }) {
  const tone = value === 'Urgent' ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300' : value === 'Important' ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  const mark = value === 'Urgent' ? '🔴' : value === 'Important' ? '🟡' : '🟢';
  return <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] ${tone}`}><span aria-hidden="true">{mark}</span>{value}</span>;
}

function TaskCard({ task, lead, onStatus }: { task: GenesisNode; lead?: GenesisNode; onStatus: (task: GenesisNode, status: TaskStatus) => void }) {
  const state = (getFieldValue(task, 'Status task Command Center') || 'De făcut') as TaskStatus;
  const action = getFieldValue(task, 'Acțiune Command Center') || 'Acțiune';
  const priority = getFieldValue(task, 'Prioritate Command Center') || 'Normal';
  const eventDay = lead ? fieldDay(lead, 'Data evenimentului') : null;
  const phone = lead ? getFieldValue(lead, 'Telefon') : null;
  const email = lead ? getFieldValue(lead, 'Email') : null;
  const owner = lead ? getFieldValue(lead, 'Persoana responsabilă') : null;
  return (
    <article className="border border-border bg-card p-4 shadow-sm shadow-foreground/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-primary">{action}</p>
          <h3 className="mt-1 truncate text-base font-semibold tracking-[-0.03em]">{lead ? leadName(lead) : getTitle(task) ?? 'Acțiune CRM'}</h3>
        </div>
        <PriorityBadge value={priority} />
      </div>
      {lead ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{getFieldValue(lead, 'Tip eveniment') || 'Eveniment'}{getFieldValue(lead, 'Locație') ? ` · ${getFieldValue(lead, 'Locație')}` : ''}{eventDay ? ` · ${eventDay}` : ''}</p> : null}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {phone ? <a className="inline-flex min-h-8 items-center gap-1.5 hover:text-primary" href={`tel:${phone}`}><Phone className="h-3.5 w-3.5" aria-hidden="true" />{phone}</a> : null}
        {email ? <a className="inline-flex min-h-8 min-w-0 items-center gap-1.5 truncate hover:text-primary" href={`mailto:${email}`}><FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{email}</a> : null}
        {owner ? <span className="inline-flex min-h-8 items-center gap-1.5"><span className="text-muted-foreground/70">Responsabil:</span>{owner}</span> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${state === 'Finalizat' ? 'text-emerald-700 dark:text-emerald-300' : state === 'Nu s-a putut realiza' ? 'text-destructive' : state === 'În lucru' ? 'text-primary' : 'text-muted-foreground'}`}>
          {state === 'Finalizat' ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />}
          {state}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {TASK_STATES.map((nextState) => <button key={nextState} type="button" aria-pressed={state === nextState} onClick={() => onStatus(task, nextState)} className={`min-h-9 border px-2 text-[9px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${state === nextState ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}>{nextState}</button>)}
        </div>
      </div>
    </article>
  );
}

function QueueSection({ title, detail, icon, tasks, leadsById, onStatus, emptyText }: { title: string; detail: string; icon: React.ReactNode; tasks: GenesisNode[]; leadsById: Map<string, GenesisNode>; onStatus: (task: GenesisNode, status: TaskStatus) => void; emptyText: string }) {
  const hasTasks = tasks.length > 0;
  return (
    <section className="border-t border-border pt-5" aria-label={title}>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-primary/25 bg-primary/5 text-primary">{icon}</span><div className="min-w-0"><h2 className="font-mono text-xs font-bold uppercase tracking-[0.12em]">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div></div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{tasks.length}</span>
      </div>
      {hasTasks ? <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{tasks.map((task) => <TaskCard key={task.id} task={task} lead={task.parentId ? leadsById.get(task.parentId) : undefined} onStatus={onStatus} />)}</div> : <p className="border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">{emptyText}</p>}
    </section>
  );
}

export default function CommandCenterPage() {
  const crm = useLiveNodes(CRM_PROJECT_ID);
  const today = localDay(new Date());
  const [selectedDay, setSelectedDay] = useState(today);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const leads = useMemo(() => crm.nodes.filter(isLead), [crm.nodes]);
  const tasks = useMemo(() => crm.nodes.filter((node) => Boolean(getFieldValue(node, 'Acțiune Command Center'))), [crm.nodes]);
  const leadsById = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads]);
  const pendingLeads = useMemo(() => leads.filter((lead) => {
    const action = ACTION_BY_STATUS[getFieldValue(lead, 'Status') || ''];
    if (!action) return false;
    const matched = tasks.find((task) => task.parentId === lead.id && getFieldValue(task, 'Acțiune Command Center') === action && getFieldValue(task, 'Status lead la generare') === getFieldValue(lead, 'Status'));
    return !matched || !isClosed(matched);
  }), [leads, tasks]);
  const missingLeads = useMemo(() => leads.filter((lead) => {
    const action = ACTION_BY_STATUS[getFieldValue(lead, 'Status') || ''];
    if (!action) return false;
    return !tasks.some((task) => task.parentId === lead.id && getFieldValue(task, 'Acțiune Command Center') === action && getFieldValue(task, 'Status lead la generare') === getFieldValue(lead, 'Status'));
  }), [leads, tasks]);
  const metrics = useMemo(() => {
    const overdue = tasks.filter((task) => { const due = fieldDay(task, 'Termen Command Center'); return !isClosed(task) && due != null && due < today; }).length;
    const finished = tasks.filter((task) => getFieldValue(task, 'Status task Command Center') === 'Finalizat' && fieldDay(task, 'Termen Command Center') === selectedDay).length;
    return {
      calls: pendingLeads.filter((lead) => ACTION_BY_STATUS[getFieldValue(lead, 'Status') || ''] === 'De sunat').length,
      offers: pendingLeads.filter((lead) => ACTION_BY_STATUS[getFieldValue(lead, 'Status') || ''] === 'De ofertat').length,
      followUps: pendingLeads.filter((lead) => ACTION_BY_STATUS[getFieldValue(lead, 'Status') || ''] === 'Follow-up').length,
      overdue,
      finished,
    };
  }, [pendingLeads, tasks, today, selectedDay]);
  const sortedOpen = useMemo(() => tasks.filter((task) => !isClosed(task)).sort((a, b) => {
    const priorityA = PRIORITY_ORDER[getFieldValue(a, 'Prioritate Command Center') || 'Normal'] ?? 3;
    const priorityB = PRIORITY_ORDER[getFieldValue(b, 'Prioritate Command Center') || 'Normal'] ?? 3;
    return priorityA - priorityB || (fieldDay(a, 'Termen Command Center') || '').localeCompare(fieldDay(b, 'Termen Command Center') || '');
  }), [tasks]);
  const dueToday = sortedOpen.filter((task) => fieldDay(task, 'Termen Command Center') === selectedDay);
  const calls = dueToday.filter((task) => getFieldValue(task, 'Acțiune Command Center') === 'De sunat');
  const offers = dueToday.filter((task) => getFieldValue(task, 'Acțiune Command Center') === 'De ofertat');
  const followUps = dueToday.filter((task) => getFieldValue(task, 'Acțiune Command Center') === 'Follow-up');
  const overdueTasks = sortedOpen.filter((task) => { const due = fieldDay(task, 'Termen Command Center'); return due != null && due < today; });
  const completedToday = tasks.filter((task) => getFieldValue(task, 'Status task Command Center') === 'Finalizat' && fieldDay(task, 'Termen Command Center') === selectedDay).sort((a, b) => (fieldDay(b, 'Termen Command Center') || '').localeCompare(fieldDay(a, 'Termen Command Center') || ''));
  const pendingCount = pendingLeads.length;
  const missingCount = missingLeads.length;
  const hasOpenTasks = sortedOpen.length > 0;
  const initial = crm.loading && crm.updatedAt == null;

  async function generateMissing() {
    setMessage(null);
    setNotice(null);
    setSaving(true);
    let created = 0;
    const known = new Set(tasks.map((task) => `${task.parentId}:${getFieldValue(task, 'Acțiune Command Center')}:${getFieldValue(task, 'Status lead la generare')}`));
    try {
      for (const lead of missingLeads) {
        const status = getFieldValue(lead, 'Status') || '';
        const action = ACTION_BY_STATUS[status];
        if (!action) continue;
        const key = `${lead.id}:${action}:${status}`;
        if (known.has(key)) continue;
        const title = leadName(lead);
        const priority = priorityFor(lead, today);
        const dueAt = new Date(`${selectedDay}T09:00:00`).toISOString();
        const result = await createNode(CRM_PROJECT_ID, {
          parentId: lead.id,
          '/text': `${action} · ${title}`,
          'Acțiune Command Center': action,
          'Termen Command Center': dueAt,
          'Prioritate Command Center': priority,
          'Status task Command Center': 'De făcut',
          'Status lead la generare': status,
          'Generat la': new Date().toISOString(),
        });
        if (result.ignoredKeys.length > 0) throw new Error(`Unele câmpuri nu au fost salvate: ${result.ignoredKeys.join(', ')}.`);
        known.add(key);
        created += 1;
      }
      await crm.refresh();
      setNotice(created ? `${created} ${created === 1 ? 'activitate a fost creată' : 'activități au fost create'} și legată de lead. Activitățile existente nu au fost duplicate.` : 'Nu sunt activități lipsă pentru statusurile curente.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Activitățile nu au putut fi create. Încearcă din nou.');
      await crm.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function changeTaskStatus(task: GenesisNode, status: TaskStatus) {
    setMessage(null);
    setNotice(null);
    try {
      const result = await updateNode(CRM_PROJECT_ID, task.id, { 'Status task Command Center': status });
      if (result.ignoredKeys.length > 0) throw new Error('Starea activității nu a putut fi salvată.');
      await crm.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Starea activității nu a putut fi salvată.');
    }
  }

  const selectedLabel = getDayLabel(selectedDay, today);
  return (
    <div className="min-h-screen bg-background md:pl-[264px]">
      <CrmSidebar />
      <main className="min-h-screen min-w-0 text-foreground">
        <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-primary">SCENOTEHNICA / Command Center</p><h1 className="mt-1 text-xl font-semibold tracking-[-0.05em] sm:text-2xl">Ce trebuie să fac astăzi?</h1></div>
            <Link to="/crm" className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-[10px] font-bold uppercase tracking-[0.08em] hover:border-primary hover:text-primary"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Lead Pipeline</Link>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-6 lg:px-8">
          <section className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ritm comercial · {selectedLabel}</p><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Acțiunile sunt legate de lead-ul lor și păstrează istoricul în CRM. Indicatorii se calculează din statusurile și activitățile salvate.</p></div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Vezi ieri" onClick={() => setSelectedDay((day) => shiftDay(day, -1))} className="inline-flex min-h-11 items-center gap-1.5 border border-border px-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.06em] hover:border-primary hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />IERI</button>
              <button type="button" aria-pressed={selectedDay === today} onClick={() => setSelectedDay(today)} className={`min-h-11 border px-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${selectedDay === today ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary'}`}>ASTĂZI</button>
              <button type="button" aria-label="Vezi mâine" onClick={() => setSelectedDay((day) => shiftDay(day, 1))} className="inline-flex min-h-11 items-center gap-1.5 border border-border px-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.06em] hover:border-primary hover:text-primary">MÂINE<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
            </div>
          </section>

          {crm.error && crm.updatedAt != null ? <p role="status" className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><CircleAlert className="h-4 w-4 text-primary" aria-hidden="true" />Ultima actualizare nu s-a finalizat. <button type="button" onClick={() => void crm.refresh()} className="font-semibold text-primary underline">Reîncarcă</button></p> : null}
          {crm.error && crm.updatedAt == null ? <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 border border-destructive/40 bg-destructive/5 p-4 text-sm"><CircleAlert className="h-4 w-4 text-destructive" aria-hidden="true" />Nu am putut încărca solicitările CRM.<button type="button" onClick={() => void crm.refresh()} className="min-h-11 border border-border px-3 text-xs font-semibold hover:border-primary">Încearcă din nou</button></div> : null}
          {message ? <p role="alert" className="mt-4 border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">{message}</p> : null}
          {notice ? <p role="status" className="mt-4 border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">{notice}</p> : null}

          {initial ? <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-5">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-24 animate-pulse bg-muted" />)}</div> : <div className="mt-5 grid grid-cols-2 overflow-hidden border border-border bg-card sm:grid-cols-5"><Metric label="De sunat" value={metrics.calls} tone="text-primary" /><Metric label="De ofertat" value={metrics.offers} /><Metric label="Follow-up" value={metrics.followUps} /><Metric label="Restante" value={metrics.overdue} tone={metrics.overdue ? 'text-destructive' : 'text-foreground'} /><Metric label="Finalizate" value={metrics.finished} tone="text-emerald-700 dark:text-emerald-300" /></div>}

          <section className="mt-5 flex flex-col gap-3 border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" aria-hidden="true" /></span><div><h2 className="text-sm font-semibold">Activități din statusurile CRM</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{missingCount} lead-uri au nevoie de o activitate nouă pentru statusul curent.</p></div></div>
            <button type="button" disabled={saving || missingCount === 0} onClick={() => void generateMissing()} className="inline-flex min-h-11 items-center justify-center gap-2 border border-primary bg-primary px-4 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"><RotateCcw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} aria-hidden="true" />{saving ? 'Se creează...' : 'Creează activitățile lipsă'}</button>
          </section>

          <div className="mt-7 grid grid-cols-1 gap-7 2xl:grid-cols-2">
            <QueueSection title="DE SUNAT" detail={`Apeluri programate pentru ${selectedLabel.toLowerCase()}`} icon={<Phone className="h-4 w-4" aria-hidden="true" />} tasks={calls} leadsById={leadsById} onStatus={changeTaskStatus} emptyText="Nu sunt apeluri în această zi. Generează activitățile lipsă pentru lead-urile noi." />
            <QueueSection title="DE OFERTAT" detail={`Oferte de pregătit pentru ${selectedLabel.toLowerCase()}`} icon={<FileText className="h-4 w-4" aria-hidden="true" />} tasks={offers} leadsById={leadsById} onStatus={changeTaskStatus} emptyText="Nu sunt oferte programate pentru această zi." />
            <QueueSection title={`FOLLOW-UP · ${selectedLabel}`} detail="Reveniri pentru lead-urile cu ofertă trimisă" icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />} tasks={followUps} leadsById={leadsById} onStatus={changeTaskStatus} emptyText="Nu sunt reveniri programate pentru această zi." />
            <QueueSection title="RESTANTE" detail="Activități deschise cu termen anterior zilei de astăzi" icon={<Clock3 className="h-4 w-4" aria-hidden="true" />} tasks={overdueTasks} leadsById={leadsById} onStatus={changeTaskStatus} emptyText="Nu există activități restante." />
          </div>

          <section className="mt-8 border-t border-border pt-5" aria-label="Activități finalizate">
            <div className="mb-3 flex items-start justify-between gap-4"><div><h2 className="font-mono text-xs font-bold uppercase tracking-[0.12em]">FINALIZATE · {selectedLabel}</h2><p className="mt-1 text-xs text-muted-foreground">Rămân în istoricul lead-ului pentru consultare.</p></div><span className="font-mono text-xs tabular-nums text-muted-foreground">{completedToday.length}</span></div>
            {completedToday.length ? <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{completedToday.map((task) => <TaskCard key={task.id} task={task} lead={task.parentId ? leadsById.get(task.parentId) : undefined} onStatus={changeTaskStatus} />)}</div> : <p className="border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">Nicio activitate finalizată pentru această zi.</p>}
          </section>

          {!hasOpenTasks && pendingCount === 0 && !initial ? <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><Check className="h-4 w-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />Toate lead-urile active au deja o activitate închisă sau nu mai necesită următorul pas comercial.</p> : null}
          <p className="mt-8 flex items-center gap-2 border-t border-border pt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"><RefreshCw className="h-3 w-3" aria-hidden="true" />Lista se actualizează automat cât timp pagina este deschisă · {leads.length} lead-uri conectate</p>
        </div>
      </main>
    </div>
  );
}
