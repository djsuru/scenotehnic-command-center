import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LockKeyhole, RefreshCw } from '@/lib/icons';
import { useLiveNodes } from '@/hooks/use-live-nodes';
import { Workspace } from '@/pages/CrmPage';
import { accessRecord, type AccessRecord } from '@/components/crm/access';

const ACCESS_PROJECT_ID = 'XAxVxTq64BqJZ8b8';

function StatusCard({ title, message, tone = 'neutral', onRefresh }: { title: string; message: string; tone?: 'neutral' | 'warning' | 'danger'; onRefresh?: () => void }) {
  const toneClass = tone === 'warning' ? 'border-primary/50' : tone === 'danger' ? 'border-destructive/50' : 'border-border';
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12 text-foreground">
      <section className={`w-full max-w-lg border bg-card p-8 shadow-xl shadow-foreground/5 ${toneClass}`}>
        <div className="flex h-12 w-12 items-center justify-center bg-primary text-primary-foreground"><LockKeyhole className="h-5 w-5" aria-hidden="true" /></div>
        <p className="mt-8 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">SCENOTECHNIC / LINK DE ACTIVARE</p>
        <h1 className="mt-4 text-4xl font-semibold leading-[0.95] tracking-[-0.06em]">{title}</h1>
        <p className="mt-5 text-sm leading-6 text-muted-foreground">{message}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {onRefresh ? <button type="button" onClick={onRefresh} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-foreground px-5 text-xs font-bold uppercase tracking-[0.1em] text-background"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Verifică din nou</button> : null}
          <Link to="/" className="inline-flex min-h-12 flex-1 items-center justify-center border border-border px-5 text-xs font-bold uppercase tracking-[0.1em] text-foreground">Site public</Link>
        </div>
      </section>
    </main>
  );
}

function ActivatedWorkspace({ current }: { current: AccessRecord }) {
  const navigate = useNavigate();
  return <Workspace email="Acces prin link unic" current={current} onSignOut={() => navigate('/')} />;
}

export default function ActivationPage() {
  const { token = '' } = useParams<{ token: string }>();
  const access = useLiveNodes(ACCESS_PROJECT_ID);
  const records = useMemo(() => access.nodes.map(accessRecord), [access.nodes]);
  const current = records.find((record) => record.token === token);
  const loading = access.loading && access.updatedAt == null;

  if (loading) return <StatusCard title="Pregătim accesul." message="Verificăm linkul de activare în directorul SCENOTECHNIC." />;
  if (access.error && access.updatedAt == null) return <StatusCard title="Linkul nu poate fi verificat." message="Directorul de acces nu a putut fi încărcat. Încearcă din nou." tone="danger" onRefresh={() => void access.refresh()} />;
  if (!current) return <StatusCard title="Link necunoscut." message="Acest link nu corespunde niciunui slot de acces SCENOTECHNIC. Cere administratorului un link nou." tone="danger" />;
  if (current.access === 'Blocat') return <StatusCard title="Acces blocat." message="Administratorul a blocat acest link. Ai nevoie de un link nou pentru a continua." tone="danger" />;
  if (current.access !== 'Activ') return <StatusCard title="Aprobarea este în așteptare." message={`Linkul pentru ${current.name} este valid, dar administratorul trebuie să apese „Activează” în CRM. Revino aici după aprobare.`} tone="warning" onRefresh={() => void access.refresh()} />;
  return <ActivatedWorkspace current={current} />;
}
