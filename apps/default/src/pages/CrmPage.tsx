import { useMemo, useRef, useState } from 'react';
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { Link } from 'react-router-dom';
import { ArrowLeft, CircleAlert, LogOut, RefreshCw, ShieldCheck } from '@/lib/icons';
import type { AccessRecord } from '@/components/crm/access';
import { useLiveNodes } from '@/hooks/use-live-nodes';
import { createNode, getFieldNumber, getFieldValue, getTitle, updateNode, type GenesisNode } from '@/lib/genesis-data';
import RequestCard from '@/components/crm/RequestCard';
import LeadDetailsPanel from '@/components/crm/LeadDetailsPanel';
import { STATUS_OPTIONS, statusLabel } from '@/components/crm/status';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CrmSidebar from '@/components/crm/CrmSidebar';

const CRM_PROJECT_ID = '3KVpvuU7hRz7hSjv';
const NEXT_ACTION: Record<string, string | undefined> = { Nou: 'De sunat', Contactat: 'De ofertat', 'Se califică': 'De ofertat', Ofertat: 'Follow-up' };
function commandPriority(node: GenesisNode) { const eventDate = getFieldValue(node, 'Data evenimentului'); const days = eventDate ? (new Date(eventDate).getTime() - Date.now()) / 86400000 : Number.POSITIVE_INFINITY; return days <= 7 ? 'Urgent' : days <= 30 ? 'Important' : 'Normal'; }
const STATUS_STYLES: Record<string, string> = { Nou: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300', Contactat: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300', 'Se califică': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', Ofertat: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300', 'Câștigat': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', Pierdut: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300' };

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className="min-w-0 bg-card px-4 py-3"><p className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-semibold tracking-[-0.05em] tabular-nums ${accent ? 'text-primary' : ''}`}>{value}</p></div>; }
function Badge({ status }: { status: string }) { return <span className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] ${STATUS_STYLES[status] ?? 'border-border bg-muted text-muted-foreground'}`}>{status || 'Fără status'}</span>; }

function isLeadRecord(node: GenesisNode) { return node.parentId == null && !getFieldValue(node, 'Acțiune Command Center') && Boolean(getFieldValue(node, 'Nume contact') || getFieldValue(node, 'Email') || getFieldValue(node, 'Telefon')); }

export function Workspace({ email, current, onSignOut }: { email?: string; current?: AccessRecord; onSignOut?: () => void }) { const crm = useLiveNodes(CRM_PROJECT_ID); const inFlightUpdates = useRef(new Set<string>()); const leads = useMemo(() => crm.nodes.filter(isLeadRecord), [crm.nodes]); const [filter, setFilter] = useState('Toate'); const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null); const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null); const selectedNode = leads.find((node) => node.id === selectedNodeId) ?? null; const columns = useMemo(() => { const stages = Array.from(new Set([...STATUS_OPTIONS, ...leads.map((node) => statusLabel(getFieldValue(node, 'Status') ?? 'Nou'))])); return stages.filter((status) => filter === 'Toate' || status === filter).map((status) => { const nodes = leads.filter((node) => statusLabel(getFieldValue(node, 'Status') ?? 'Nou') === status); return { status, nodes, isEmpty: nodes.length === 0 }; }).filter((column) => column.status !== 'Câștigat' || column.nodes.length > 0); }, [leads, filter]); const counts = useMemo(() => STATUS_OPTIONS.reduce<Record<string, number>>((all, status) => ({ ...all, [status]: leads.filter((node) => statusLabel(getFieldValue(node, 'Status') ?? 'Nou') === status).length }), {}), [leads]); const totalParticipants = leads.reduce((sum, node) => sum + (getFieldNumber(node, 'Participanți') ?? 0), 0); const initial = crm.loading && crm.updatedAt == null; async function onStatus(node: GenesisNode, status: string) {
    const lead = crm.nodes.find((item) => item.id === node.id && isLeadRecord(item));
    if (!lead) {
      const error = new Error('Această solicitare nu mai este disponibilă în Pipeline. Reîncarcă lista și încearcă din nou.');
      setMessage(error.message);
      throw error;
    }
    const nextStatus = statusLabel(status);
    if (!STATUS_OPTIONS.includes(nextStatus)) {
      const error = new Error('Etapa selectată nu este validă.');
      setMessage(error.message);
      throw error;
    }
    if (inFlightUpdates.current.has(lead.id)) {
      const error = new Error('Salvarea acestei solicitări este deja în curs.');
      setMessage(error.message);
      throw error;
    }
    inFlightUpdates.current.add(lead.id);
    setDraggingNodeId(lead.id);
    setMessage(null);
    try {
      const previousStatus = statusLabel(getFieldValue(lead, 'Status') ?? 'Nou');
      if (previousStatus === nextStatus) return;
      const result = await updateNode(CRM_PROJECT_ID, lead.id, { Status: nextStatus });
      if (result.ignoredKeys.length) throw new Error('Statusul nu a putut fi salvat.');
      const action = NEXT_ACTION[nextStatus];
      const exists = action && crm.nodes.some((item) => item.parentId === lead.id && getFieldValue(item, 'Acțiune Command Center') === action && getFieldValue(item, 'Status lead la generare') === nextStatus);
      if (action && !exists) {
        const dueAt = new Date();
        dueAt.setHours(9, 0, 0, 0);
        const created = await createNode(CRM_PROJECT_ID, {
          parentId: lead.id,
          '/text': `${action} · ${getTitle(lead, 'Nume contact') ?? 'Solicitare nouă'}`,
          'Acțiune Command Center': action,
          'Termen Command Center': dueAt.toISOString(),
          'Prioritate Command Center': commandPriority(lead),
          'Status task Command Center': 'De făcut',
          'Status lead la generare': nextStatus,
          'Generat la': new Date().toISOString(),
        });
        if (created.ignoredKeys.length) throw new Error('Statusul s-a actualizat, dar activitatea aferentă nu a putut fi salvată.');
      }
      await crm.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Statusul nu a putut fi salvat.');
      throw error;
    } finally {
      inFlightUpdates.current.delete(lead.id);
    }
  } async function handleDragEnd(result: DropResult) { const destination = result.destination; if (!destination || destination.droppableId === result.source.droppableId) return; const node = leads.find((item) => item.id === result.draggableId); if (!node) { setMessage('Solicitarea nu mai este disponibilă. Reîncarcă lista și încearcă din nou.'); return; } setMessage(null); setNotice(null); setDraggingNodeId(node.id); try { await onStatus(node, destination.droppableId); setNotice(`${getTitle(node, 'Nume contact') ?? 'Solicitarea'} a fost mutată în etapa ${destination.droppableId}.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Mutarea nu a reușit. Încearcă din nou.'); } finally { setDraggingNodeId(null); } } async function onInteraction(node: GenesisNode, fields: Record<string, string>) { setMessage(null); try { const result = await updateNode(CRM_PROJECT_ID, node.id, fields); if (result.ignoredKeys.length) throw new Error('Detaliile nu au putut fi salvate.'); await crm.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Detaliile nu au putut fi salvate.'); throw error; } } return <main className="min-h-screen bg-background text-foreground"><header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-xl"><div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 sm:px-8 lg:px-12"><Link to="/" className="inline-flex min-h-11 items-center gap-3 hover:text-primary"><span className="flex h-9 w-9 items-center justify-center bg-primary text-primary-foreground"><ShieldCheck className="h-4 w-4" aria-hidden="true" /></span><span className="font-mono text-xs font-bold tracking-[-0.03em]">SCENOTEHNICA / CRM</span></Link><div className="flex items-center gap-3"><span className="hidden text-right sm:block"><span className="block text-xs font-semibold">{current?.name ?? 'Echipă CRM'}</span><span className="block font-mono text-[9px] uppercase tracking-[0.12em] text-primary">{current?.role ?? 'Acces deschis'}</span></span>{onSignOut ? <button type="button" aria-label="Ieși din cont" onClick={onSignOut} className="inline-flex min-h-11 min-w-11 items-center justify-center border border-border text-muted-foreground hover:text-primary"><LogOut className="h-4 w-4" aria-hidden="true" /></button> : null}</div></div></header><div className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-6 lg:px-8"><div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Control room / acces deschis</p><h1 className="mt-1 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.06em] sm:text-4xl">Solicitări care cer un răspuns clar.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Bun venit, {email || current?.name || 'echipa CRM'}. Aici echipa de vânzări vede fiecare cerere și îi schimbă statusul.</p></div><Link to="/" className="inline-flex min-h-11 items-center gap-2 border-b border-foreground px-1 text-xs font-bold uppercase tracking-[0.1em] hover:border-primary hover:text-primary"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Site public</Link></div>{crm.error && crm.updatedAt != null ? <p role="status" className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><CircleAlert className="h-4 w-4 text-primary" aria-hidden="true" /> Ultima actualizare nu s-a finalizat. <button type="button" onClick={() => void crm.refresh()} className="font-semibold text-primary underline">Reîncarcă</button></p> : null}{message ? <p role="alert" className="mt-5 border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">{message}</p> : null}{notice ? <p role="status" className="mt-5 border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">{notice}</p> : null}{initial ? <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-4"><div className="h-28 animate-pulse bg-muted" /><div className="h-28 animate-pulse bg-muted" /><div className="h-28 animate-pulse bg-muted" /><div className="h-28 animate-pulse bg-muted" /></div> : <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-4"><Metric label="Total solicitări" value={String(leads.length)} accent /><Metric label="Noi" value={String(counts.Nou ?? 0)} /><Metric label="Câștigate" value={String(counts['Câștigat'] ?? 0)} /><Metric label="Participanți estimați" value={String(totalParticipants)} /></div>}<div className="mt-6 flex flex-col gap-3 border-b border-border pb-3"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Pipeline activ</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.05em]">Pipeline de clienți potențiali</h2><p className="mt-1 text-xs text-muted-foreground">Folosește mânerul din stânga cardului pentru a-l muta între etape; selectează cardul pentru detalii.</p></div><div className="flex flex-wrap gap-2">{STATUS_OPTIONS.filter((option) => option !== 'Câștigat').map((option) => <button type="button" key={option} aria-pressed={filter === option} onClick={() => setFilter((current) => current === option ? 'Toate' : option)} className={`min-h-11 border px-3 text-[10px] font-bold uppercase tracking-[0.08em] ${filter === option ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}>{option} · {counts[option] ?? 0}</button>)}</div></div><div className="mt-4 overflow-x-auto pb-3"><DragDropContext onDragStart={() => { setMessage(null); setNotice(null); }} onDragEnd={(result) => { void handleDragEnd(result); }}><div className="grid min-w-[1320px] grid-cols-5 gap-3">{columns.map((column) => <Droppable key={column.status} droppableId={column.status}>{(provided, snapshot) => <section ref={provided.innerRef} {...provided.droppableProps} aria-label={`Coloana ${column.status}`} className={`min-h-[420px] rounded-md border p-3 transition-colors ${snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'}`}><div className="flex items-center justify-between gap-2 border-b border-border pb-3"><Badge status={column.status} /><span className="font-mono text-[10px] tabular-nums text-muted-foreground">{column.nodes.length}</span></div><div className="mt-3 grid min-h-[340px] content-start gap-2">{column.nodes.map((node, index) => <Draggable key={node.id} draggableId={node.id} index={index} isDragDisabled={draggingNodeId === node.id}>{(drag) => <RequestCard node={node} selected={selectedNodeId === node.id} onSelect={(selected) => setSelectedNodeId(selected.id)} drag={drag} />}</Draggable>)}{provided.placeholder}{column.isEmpty ? <p className="border border-dashed border-border p-4 text-xs leading-5 text-muted-foreground">Nicio solicitare în această etapă.</p> : null}</div></section>}</Droppable>)}</div></DragDropContext></div><p className="mt-10 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground"><RefreshCw className="h-3 w-3" aria-hidden="true" /> Date sincronizate automat cât timp pagina rămâne deschisă</p></div><Sheet open={selectedNode != null} onOpenChange={(open) => { if (!open) setSelectedNodeId(null); }}><SheetContent side="right" className="w-full max-w-none gap-0 overflow-hidden overscroll-contain p-0 sm:w-[420px] sm:max-w-[420px]">{selectedNode ? <LeadDetailsPanel node={selectedNode} onStatus={onStatus} onInteraction={onInteraction} /> : null}</SheetContent></Sheet></main>; }
export default function CrmPage() { return <div className="min-h-screen bg-background md:pl-[264px]"><CrmSidebar /><div className="min-w-0"><Workspace /></div></div>; }
