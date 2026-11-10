import { useMemo } from 'react';
import CrmSidebar from '@/components/crm/CrmSidebar';
import AccessPanel from '@/components/crm/AccessPanel';
import { accessRecord } from '@/components/crm/access';
import { useLiveNodes } from '@/hooks/use-live-nodes';
import { updateNode } from '@/lib/genesis-data';

const ACCESS_PROJECT_ID = 'XAxVxTq64BqJZ8b8';

export default function SettingsPage() {
  const access = useLiveNodes(ACCESS_PROJECT_ID);
  const records = useMemo(() => access.nodes.map(accessRecord), [access.nodes]);
  const loading = access.loading && access.updatedAt == null;

  async function onActivate(record: (typeof records)[number], nextAccess: string) {
    const result = await updateNode(ACCESS_PROJECT_ID, record.node.id, { Acces: nextAccess });
    if (result.ignoredKeys.length) throw new Error('Starea linkului nu a putut fi salvată.');
    await access.refresh();
  }

  return (
    <div className="min-h-screen bg-background md:pl-[264px]">
      <CrmSidebar />
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="border-b border-border pb-6">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Settings / administrare echipă</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.06em] sm:text-4xl">Settings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Gestionează activarea și linkurile echipei de vânzări.</p>
          </header>
          {access.error && access.updatedAt != null ? (
            <p role="status" className="mt-5 border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              Lista nu s-a actualizat. <button type="button" onClick={() => void access.refresh()} className="font-semibold text-primary underline">Reîncarcă</button>
            </p>
          ) : null}
          {loading ? (
            <section aria-label="Se încarcă accesul echipei" className="mt-6 space-y-3">
              <div className="h-6 w-48 animate-pulse bg-muted" />
              <div className="h-24 animate-pulse bg-muted" />
              <div className="h-24 animate-pulse bg-muted" />
            </section>
          ) : access.error && access.updatedAt == null ? (
            <section role="alert" className="mt-6 border border-destructive/40 bg-destructive/5 p-5">
              <p className="text-sm font-semibold">Directorul de acces nu s-a încărcat.</p>
              <button type="button" onClick={() => void access.refresh()} className="mt-3 min-h-11 font-semibold text-primary underline">Încearcă din nou</button>
            </section>
          ) : (
            <div className="mt-6">
              <AccessPanel records={records} onActivate={onActivate} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
