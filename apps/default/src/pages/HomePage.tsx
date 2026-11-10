import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  Menu,
  MonitorPlay,
  Music2,
  ShieldCheck,
  Sparkles,
  Volume2,
  X,
} from '@/lib/icons';
import {
  createNode,
  getFieldNumber,
  getFieldValue,
  getNodes,
  getTitle,
  type GenesisNode,
} from '@/lib/genesis-data';

const CONTENT_PROJECT_ID = 'NbwCwDmTs2s25sPg';
const CONTACT_URL = 'https://scenotehnic-xmhzxyoj.manus.space/contact/';
const HERO_IMAGE_URL = 'https://www.scenotehnica.ro/uploads/media/2023/7/6/sua-2023-poza-3-bypi.jpg';
const FIRST_PACKAGE_IMAGE_URL = 'https://files.taskade.com/space-files/511faa76-9a31-429e-af17-d84735e486b2/original/small-ecran-led-conferinta-lorand-5-dsi5.jpeg';
const SECOND_PACKAGE_IMAGE_URL = 'https://files.taskade.com/space-files/64dc22dc-490e-48c9-a8c7-96f5512a2145/original/big-concres-fc0c.jpeg';
const THIRD_PACKAGE_IMAGE_URL = 'https://files.taskade.com/space-files/9eadf842-5070-40d3-973f-82ef400e6ebf/original/Screenshot%202026-10-01%20191823.png';
const LOGO_IMAGE_URL = 'https://files.taskade.com/space-files/098512e6-44a7-4264-acc2-74e6c8352dbc/original/scenotehnica%20sigla%20in%20pdf.jpg.png';
const LOGO_LINK_URL = 'https://www.scenotehnica.ro/';

const sectionKeys = {
  hero: 'hero',
  service: 'service',
  package: 'package',
  reason: 'reason',
} as const;

const serviceIcons = [Volume2, Sparkles, MonitorPlay, ShieldCheck, Sparkles, Music2];

function BrandMark() {
  return (
    <span className="relative flex h-10 w-14 items-center justify-center" aria-hidden="true">
      <span className="absolute left-2 top-1 h-5 w-2 rotate-[-22deg] rounded-t-full border-2 border-foreground border-b-0" />
      <span className="absolute right-2 top-1 h-5 w-2 rotate-[22deg] rounded-t-full border-2 border-foreground border-b-0" />
      <span className="absolute left-4 top-5 h-4 w-px rotate-[44deg] bg-foreground" />
      <span className="absolute right-4 top-5 h-4 w-px rotate-[-44deg] bg-foreground" />
      <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-primary" />
    </span>
  );
}

function LogoLockup({ inverted = false, image = false }: { inverted?: boolean; image?: boolean }) {
  if (image) {
    return (
      <a
        href={LOGO_LINK_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Vizitează scenotehnica.ro"
        className="group block h-12 w-40 overflow-hidden bg-transparent transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:opacity-75"
      >
        <img src={LOGO_IMAGE_URL} alt="Logo SCENOTEHNICA.RO" className="h-full w-full object-contain" />
      </a>
    );
  }

  return (
    <span className={`flex items-center gap-2 ${inverted ? 'text-background' : 'text-foreground'}`}>
      <BrandMark />
      <span className="font-mono text-[11px] font-bold tracking-[-0.04em] sm:text-xs">SCENOTEHNICA.RO</span>
    </span>
  );
}

function ServiceCard({ node, index }: { node: GenesisNode; index: number }) {
  const title = getTitle(node, 'Titlu', '/attributes/@scntitle') ?? 'Soluție tehnică';
  const description = getFieldValue(node, 'Descriere', '/attributes/@scndesc') ?? '';
  const meta = getFieldValue(node, 'Meta', '/attributes/@scnmeta') ?? `0${index + 1}`;
  const Icon = serviceIcons[index % serviceIcons.length];

  const separatorClass = index % 3 === 0 ? '' : 'md:border-l md:border-border md:pl-5';

  return (
    <article className={`group flex min-h-[8.75rem] flex-col justify-between border-t border-b border-border py-5 transition-colors hover:border-primary ${separatorClass}`}>
      <div className="flex items-start justify-between gap-4">
        <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">{meta}</span>
      </div>
      <div>
        <h3 className="max-w-xs text-base font-medium leading-tight tracking-[-0.035em] text-foreground sm:text-lg">{title}</h3>
        <p className="mt-2 max-w-xs text-[11px] leading-[1.45] text-muted-foreground">{description}</p>
      </div>
    </article>
  );
}

function PackageCard({ node, featured, index }: { node: GenesisNode; featured: boolean; index: number }) {
  const title = getTitle(node, 'Titlu', '/attributes/@scntitle') ?? 'Format de eveniment';
  const description = getFieldValue(node, 'Descriere', '/attributes/@scndesc') ?? '';
  const meta = getFieldValue(node, 'Meta', '/attributes/@scnmeta') ?? 'FORMAT';
  const cta = getFieldValue(node, 'CTA', '/attributes/@scncta') ?? 'Cere ofertă personalizată';
  const objectPosition = index === 0 ? 'center' : index === 1 ? 'center 58%' : 'center 35%';

  return (
    <article className={`flex min-h-[15rem] flex-col justify-between border p-3 transition-transform duration-300 hover:-translate-y-1 sm:p-4 ${featured ? 'border-primary bg-background/[0.04] text-background' : 'border-background/15 bg-background/[0.02] text-background'}`}>
      <div>
        <div className="relative mb-4 h-24 overflow-hidden bg-background/10">
          <img src={index === 0 ? FIRST_PACKAGE_IMAGE_URL : index === 1 ? SECOND_PACKAGE_IMAGE_URL : THIRD_PACKAGE_IMAGE_URL} alt={`${title}, producție tehnică SCENOTEHNICA.RO`} className="h-full w-full object-cover opacity-90" style={{ objectPosition }} />
          <span className="absolute left-3 top-2 font-mono text-[9px] font-semibold text-background">0{index + 1}</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary">{featured ? 'CEL MAI CERUT' : meta}</span>
        <h3 className="mt-4 text-xl font-medium tracking-[-0.045em]">{title}</h3>
        <p className="mt-2 max-w-xs text-[11px] leading-[1.45] text-background/60">{description}</p>
      </div>
      <a href="#contact" className="mt-4 inline-flex min-h-9 items-center gap-2 border-b border-primary/60 pb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-background hover:gap-3">
        {cta}<ArrowUpRight className="h-3 w-3 text-primary" aria-hidden="true" />
      </a>
    </article>
  );
}

function ReasonRow({ node, index }: { node: GenesisNode; index: number }) {
  const title = getTitle(node, 'Titlu', '/attributes/@scntitle') ?? 'Un singur furnizor';
  const description = getFieldValue(node, 'Descriere', '/attributes/@scndesc') ?? '';
  return (
    <div className="grid grid-cols-[2.5rem_1fr_1.5rem] gap-3 border-t border-border py-5 sm:grid-cols-[2.5rem_1fr_1.5rem] sm:gap-5">
      <span className="font-mono text-[10px] text-primary">{`0${index + 1}`}</span>
      <div>
        <h3 className="text-base font-medium tracking-[-0.03em]">{title}</h3>
        <p className="mt-2 max-w-lg text-[11px] leading-[1.45] text-muted-foreground">{description}</p>
      </div>
      <Check className="mt-1 h-4 w-4 text-primary" aria-hidden="true" />
    </div>
  );
}

function HeroTitle({ title }: { title: string }) {
  const isDefaultTitle = title.trim().toLowerCase() === 'evenimentul tău. regizat tehnic.';

  if (!isDefaultTitle) {
    return <>{title}</>;
  }

  return (
    <>
      <span className="block">Evenimentul</span>
      <span className="block">tău.</span>
      <span className="block text-primary">Regizat</span>
      <span className="block">tehnic.</span>
    </>
  );
}

function HeroDescription({ description }: { description: string }) {
  const isDefaultDescription = description.trim().toLowerCase() === 'sunet. lumini. video. scenă. un singur partener pentru un eveniment care funcționează fără improvizații.';

  if (!isDefaultDescription) {
    return <>{description}</>;
  }

  return (
    <>
      Sunet. Lumini. Video. Scenă. <strong className="font-semibold text-foreground">Un singur partener</strong>
      <br />
      pentru un eveniment care funcționează fără
      <br />
      improvizații.
    </>
  );
}

const CRM_PROJECT_ID = '3KVpvuU7hRz7hSjv';

type InquiryValues = {
  name: string;
  email: string;
  phone: string;
  company: string;
  eventDate: string;
  location: string;
  participants: string;
  eventType: string;
  objective: string;
};

const emptyInquiry: InquiryValues = {
  name: '',
  email: '',
  phone: '',
  company: '',
  eventDate: '',
  location: '',
  participants: '',
  eventType: '',
  objective: '',
};

function InquiryForm() {
  const [values, setValues] = useState<InquiryValues>(emptyInquiry);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateValue(key: keyof InquiryValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await createNode(CRM_PROJECT_ID, {
        '/text': `Solicitare de ofertă - ${values.name} - ${values.eventType}`,
        'Nume contact': values.name,
        Email: values.email,
        Telefon: values.phone,
        Companie: values.company,
        'Data evenimentului': `${values.eventDate}T00:00:00`,
        Locație: values.location,
        Participanți: Number(values.participants),
        'Tip eveniment': values.eventType,
        'Ce vrei să obții': values.objective,
        Status: 'Nou',
        Sursă: 'Formular public website',
        'Trimis la': new Date().toISOString(),
      });

      if (result.ignoredKeys.length > 0) {
        throw new Error('Unele detalii nu au putut fi salvate. Verifică formularul și încearcă din nou.');
      }

      setSubmitted(true);
      setValues(emptyInquiry);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Solicitarea nu a putut fi trimisă.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-[28rem] flex-col justify-center">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">Solicitare trimisă</span>
        <h3 className="mt-6 max-w-[10ch] text-4xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-5xl">Avem contextul. Revenim cu soluția.</h3>
        <p className="mt-5 max-w-sm text-[11px] leading-5 text-muted-foreground">Datele au fost înregistrate intern. Echipa SCENOTEHNICA va reveni pentru următorul pas.</p>
        <button type="button" onClick={() => setSubmitted(false)} className="mt-8 inline-flex min-h-11 items-center justify-center border-b border-foreground px-1 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-primary hover:text-primary">Trimite o altă solicitare</button>
      </div>
    );
  }

  const fieldClass = 'mt-1 min-w-0 w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10';
  const labelClass = 'font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground';
  const sectionTitleClass = 'mb-1.5 flex items-center gap-3 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-primary';

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-2.5">
      <p className={sectionTitleClass}><span className="text-foreground/35">01</span> Date de contact</p>
      <div className="grid gap-2 border-b border-border pb-2.5 sm:grid-cols-2">
        <label className="block"><span className={labelClass}>Nume</span><input className={fieldClass} type="text" autoComplete="name" value={values.name} onChange={(event) => updateValue('name', event.target.value)} placeholder="Numele tău" required /></label>
        <label className="block"><span className={labelClass}>Email</span><input className={fieldClass} type="email" autoComplete="email" value={values.email} onChange={(event) => updateValue('email', event.target.value)} placeholder="email@companie.ro" required /></label>
        <label className="block"><span className={labelClass}>Telefon</span><input className={fieldClass} type="tel" autoComplete="tel" value={values.phone} onChange={(event) => updateValue('phone', event.target.value)} placeholder="07xx xxx xxx" required /></label>
        <label className="block"><span className={labelClass}>Companie</span><input className={fieldClass} type="text" autoComplete="organization" value={values.company} onChange={(event) => updateValue('company', event.target.value)} placeholder="Compania sau brandul" /></label>
      </div>
      <p className={sectionTitleClass}><span className="text-foreground/35">02</span> Detalii eveniment</p>
      <div className="grid gap-2 border-b border-border pb-2.5 sm:grid-cols-2">
        <label className="block"><span className={labelClass}>Data evenimentului</span><input className={fieldClass} type="date" value={values.eventDate} onChange={(event) => updateValue('eventDate', event.target.value)} required /></label>
        <label className="block"><span className={labelClass}>Locația</span><input className={fieldClass} type="text" value={values.location} onChange={(event) => updateValue('location', event.target.value)} placeholder="Oraș / locație" required /></label>
        <label className="block"><span className={labelClass}>Participanți</span><input className={fieldClass} type="number" inputMode="numeric" min="1" value={values.participants} onChange={(event) => updateValue('participants', event.target.value)} placeholder="Număr estimat" required /></label>
        <label className="block"><span className={labelClass}>Tip eveniment</span><select className={fieldClass} value={values.eventType} onChange={(event) => updateValue('eventType', event.target.value)} required><option value="">Alege tipul</option><option value="Conferință">Conferință</option><option value="Gală">Gală</option><option value="Lansare">Lansare</option><option value="Petrecere privată">Petrecere privată</option><option value="Alt tip">Alt tip</option></select></label>
      </div>
      <div>
        <p className={sectionTitleClass}><span className="text-foreground/35">03</span> Obiectivul tău</p>
        <label className="block"><span className={labelClass}>Ce vrei să obții?</span><textarea className={`${fieldClass} min-h-24 resize-y`} value={values.objective} onChange={(event) => updateValue('objective', event.target.value)} placeholder="Povestește-ne pe scurt despre eveniment și rezultat." required /></label>
      </div>
      {error ? <p role="alert" className="border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">{error}</p> : null}
      <div className="border-t border-border pt-3">
        <button type="submit" disabled={submitting} className="inline-flex min-h-12 w-full items-center justify-center gap-3 bg-primary px-4 text-xs font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:translate-x-1 disabled:cursor-wait disabled:opacity-60">{submitting ? 'Se trimite...' : 'Cere ofertă personalizată'} <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></button>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">Răspuns cu soluție și estimare de buget.</p>
        <a href="https://wa.me/40721259407" target="_blank" rel="noreferrer" aria-label="Scrie-ne pe WhatsApp la 0721 259 407" className="mt-2 inline-flex min-h-11 w-full items-center justify-center border border-border px-4 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Sau scrie-ne pe WhatsApp ↗</a>
      </div>
    </form>
  );
}

function LoadingState() {
  return <div className="grid grid-cols-1 gap-6 md:grid-cols-3"><div className="h-64 animate-pulse bg-muted" /><div className="h-64 animate-pulse bg-muted" /><div className="h-64 animate-pulse bg-muted" /></div>;
}

export default function HomePage() {
  const [nodes, setNodes] = useState<GenesisNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void getNodes(CONTENT_PROJECT_ID)
      .then((rows) => { if (active) setNodes(rows); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Conținutul nu a putut fi încărcat.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const grouped = useMemo(() => {
    const sorted = [...nodes].sort((a, b) => (getFieldNumber(a, 'Ordine', '/attributes/@scnorder') ?? 999) - (getFieldNumber(b, 'Ordine', '/attributes/@scnorder') ?? 999));
    return {
      services: sorted.filter((node) => getFieldValue(node, 'Secțiune', '/attributes/@scnsec') === sectionKeys.service),
      packages: sorted.filter((node) => getFieldValue(node, 'Secțiune', '/attributes/@scnsec') === sectionKeys.package),
      reasons: sorted.filter((node) => getFieldValue(node, 'Secțiune', '/attributes/@scnsec') === sectionKeys.reason),
      hero: sorted.find((node) => getFieldValue(node, 'Secțiune', '/attributes/@scnsec') === sectionKeys.hero),
    };
  }, [nodes]);

  const heroTitle = grouped.hero ? getTitle(grouped.hero, 'Titlu', '/attributes/@scntitle') : 'Evenimentul tău. Regizat tehnic.';
  const heroDescription = grouped.hero ? (getFieldValue(grouped.hero, 'Descriere', '/attributes/@scndesc') ?? 'Sunet. Lumini. Video. Scenă. Un singur partener pentru un eveniment care funcționează fără improvizații.') : 'Sunet. Lumini. Video. Scenă. Un singur partener pentru un eveniment care funcționează fără improvizații.';
  const hasContent = nodes.length > 0;
  const serviceFallback = ['Sonorizare completă', 'Lumini & light show', 'Ecrane LED & video', 'Scenă & structuri', 'Efecte speciale', 'DJ & entertainment'];
  const packageFallback = ['Format compact', 'Format corporate', 'Format premium'];

  return (
    <main id="top" className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 sm:px-8 lg:px-12">
          <LogoLockup image />
          <nav className={`${menuOpen ? 'flex' : 'hidden'} absolute left-0 right-0 top-full flex-col border-b border-border bg-background px-5 py-3 md:static md:flex md:flex-row md:items-center md:gap-7 md:border-0 md:bg-transparent md:p-0`}>
            <a href="#solutii" onClick={() => setMenuOpen(false)} className="py-3 text-xs uppercase tracking-[0.13em] text-muted-foreground hover:text-foreground md:py-2">Soluții</a>
            <a href="#pachete" onClick={() => setMenuOpen(false)} className="py-3 text-xs uppercase tracking-[0.13em] text-muted-foreground hover:text-foreground md:py-2">Pachete</a>
            <a href="#proces" onClick={() => setMenuOpen(false)} className="py-3 text-xs uppercase tracking-[0.13em] text-muted-foreground hover:text-foreground md:py-2">Proces</a>
            <a href="#contact" onClick={() => setMenuOpen(false)} className="py-3 text-xs uppercase tracking-[0.13em] text-muted-foreground hover:text-foreground md:py-2">Contact</a>
            <Link to="/crm" onClick={() => setMenuOpen(false)} className="py-3 text-xs font-semibold uppercase tracking-[0.13em] text-primary hover:text-foreground md:py-2">CRM echipă</Link>
          </nav>
          <div className="flex items-center gap-2">
            <a href="#contact" className="hidden min-h-11 items-center gap-2 bg-primary px-5 text-[11px] font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:translate-x-1 sm:inline-flex">Cere ofertă <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
            <button type="button" aria-label="Deschide meniul" onClick={() => setMenuOpen((value) => !value)} className="flex min-h-11 min-w-11 items-center justify-center border border-border md:hidden">{menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-5 pb-10 pt-8 sm:px-8 sm:pb-14 sm:pt-12 lg:grid-cols-[1fr_0.9fr] lg:items-start lg:px-12">
        <div>
          <p className="mb-7 flex items-center gap-3 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-primary"><span className="h-px w-8 bg-primary" /> Event production / 2026</p>
          <h1 className="max-w-2xl text-6xl font-bold leading-[0.82] tracking-[-0.075em] sm:text-8xl lg:text-[6.6rem]"><HeroTitle title={heroTitle} /></h1>
          <p className="mt-8 max-w-[22rem] text-[12px] leading-[1.45] text-muted-foreground sm:text-sm"><HeroDescription description={heroDescription} /></p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="#contact" className="inline-flex min-h-12 items-center justify-center gap-2 bg-primary px-6 text-xs font-bold uppercase tracking-[0.13em] text-primary-foreground transition hover:translate-x-1">Cere ofertă personalizată <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
            <a href="#pachete" className="inline-flex min-h-12 items-center justify-center gap-2 border-b border-foreground/30 px-2 text-xs font-bold uppercase tracking-[0.13em] transition hover:border-primary hover:text-primary">Vezi pachetele <ChevronDown className="h-4 w-4" aria-hidden="true" /></a>
          </div>
          <div className="mt-12 border-t border-border pt-4"><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"><span className="text-primary">01</span> CONFERINȚE <span className="px-1 text-primary/70">·</span> GALE <span className="px-1 text-primary/70">·</span> LANSĂRI <span className="px-1 text-primary/70">·</span> PRIVATE</p></div>
        </div>
        <div className="relative min-h-[30rem] overflow-hidden bg-foreground sm:min-h-[38rem]">
          <img src={HERO_IMAGE_URL} alt="Moment de spectacol SCENOTEHNICA.RO cu artist și echipă tehnică pe scenă" className="absolute inset-0 h-full w-full object-cover object-center opacity-95" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-foreground/10" />
          <div className="absolute left-5 top-5 font-mono text-[9px] uppercase tracking-[0.2em] text-background">SCENE / A01 <span className="text-primary">• LIVE</span></div>
          <div className="absolute bottom-6 right-5 max-w-[10rem] text-right text-sm font-medium leading-tight text-background">Controlul<br />rămâne la noi.</div>
        </div>
      </section>

      <section className="border-y border-border bg-card/70"><div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-3 text-sm sm:flex-row sm:items-center sm:px-8 lg:px-12"><div className="flex items-center gap-4"><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Alege perspectiva</span><span className="hidden font-medium text-foreground/70 sm:inline">Două moduri de colaborare.</span></div><div className="flex flex-wrap items-center gap-1 sm:ml-auto"><span className="inline-flex min-h-9 items-center bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background">Client direct <ArrowUpRight className="ml-1 h-3 w-3 text-primary" aria-hidden="true" /></span><span className="inline-flex min-h-9 items-center px-3 py-1.5 text-[11px] text-muted-foreground">Locație / agenție / planner <ArrowUpRight className="ml-1 h-3 w-3" aria-hidden="true" /></span></div></div></section>

      <section id="solutii" className="bg-background text-foreground"><div className="mx-auto grid min-h-[36rem] w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.62fr_1.38fr] lg:gap-0 lg:px-12"><div className="flex flex-col justify-between border-b border-border pb-10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8"><div className="space-y-3"><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">01</p><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">SOLUȚII</p></div><p className="hidden max-w-[9rem] text-[10px] uppercase leading-5 tracking-[0.18em] text-muted-foreground lg:block">DE LA CONCEPT<br />LA CUE FINALĂ.</p></div><div className="lg:pl-10"><div className="mb-10 grid gap-8 md:grid-cols-[1.25fr_0.75fr] md:items-start md:gap-10 lg:gap-12"><div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Tot ce trebuie să se întâmple</p><h2 className="mt-5 max-w-[13ch] text-5xl font-medium leading-[0.88] tracking-[-0.075em] sm:text-6xl lg:text-[4.5rem]">Cumperi liniște, nu<br />echipamente.</h2></div><p className="max-w-[14rem] text-xs leading-5 text-muted-foreground md:pt-6 lg:pt-8">Pornim de la locație, public și obiectiv. Îți configurăm soluția, o montăm și rămânem responsabili pe durata evenimentului.</p></div>{loading ? <LoadingState /> : error && !hasContent ? <p role="alert" className="border border-primary/50 p-5 text-sm">{error}</p> : <div className="grid grid-cols-1 gap-x-0 gap-y-0 md:grid-cols-3">{(grouped.services.length > 0 ? grouped.services : serviceFallback.map((title, index) => ({ id: `fallback-service-${index}`, content: title, parentId: null, fieldValues: { Titlu: title, Descriere: 'Configurație tehnică adaptată formatului și spațiului.', Meta: `0${index + 1}` } } as GenesisNode))).map((node, index) => <ServiceCard key={node.id} node={node} index={index} />)}</div>}</div></div></section>

      <section id="pachete" className="bg-foreground text-background"><div className="mx-auto grid min-h-[40rem] w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-0 lg:px-12"><div className="flex flex-col justify-between border-b border-background/20 pb-10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-10"><div className="space-y-3"><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">02</p><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">PACHETE</p></div><p className="hidden max-w-[8rem] text-[10px] uppercase leading-5 tracking-[0.18em] text-background/45 lg:block">BUGET PE NIVEL<br />DE EVENIMENT.</p></div><div className="lg:pl-10"><div className="mb-8 grid gap-8 md:grid-cols-[1.25fr_0.75fr] md:items-start md:gap-10 lg:gap-12"><div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Intervale orientative</p><h2 className="mt-5 max-w-[11ch] text-5xl font-medium leading-[0.88] tracking-[-0.075em] sm:text-6xl lg:text-[4.5rem]">Spune-ne ce<br />trebuie<br /><span className="text-primary">să funcționeze.</span></h2></div><p className="max-w-[14rem] text-xs leading-5 text-background/60 md:pt-14 lg:pt-16">Nu trebuie să știi câte moving heads sau ce mixer îți trebuie. Tu ne spui formatul. Noi facem configurația corectă.</p></div><div className="grid grid-cols-1 gap-3 md:grid-cols-3">{loading ? <LoadingState /> : (grouped.packages.length > 0 ? grouped.packages : packageFallback.map((title, index) => ({ id: `fallback-package-${index}`, content: title, parentId: null, fieldValues: { Titlu: title, Descriere: ['Sunet + lumini de bază', 'Sunet + lumini + video + suport tehnic', 'Scenă + sunet + lumini + LED + echipă'][index], Meta: index === 1 ? 'Cel mai cerut' : 'Format' } } as GenesisNode))).map((node, index) => <PackageCard key={node.id} node={node} featured={index === 1} index={index} />)}</div><div className="mt-5 grid grid-cols-1 gap-3 text-xs text-background/55 sm:grid-cols-2"><p className="border-t border-background/20 pt-3"><span className="font-mono text-primary">OPȚIONALE</span> <span className="ml-3">DJ de la 400 EUR + TVA</span></p><p className="border-t border-background/20 pt-3">Fum greu de la 150 EUR + TVA</p></div></div></div></section>

      <section id="proces" className="border-y border-border bg-background"><div className="mx-auto grid min-h-[34rem] w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.62fr_1.38fr] lg:gap-0 lg:px-12"><div className="flex flex-col justify-between border-b border-border pb-10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8"><div className="space-y-3"><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">03</p><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">DE CE NOI</p></div><p className="hidden max-w-[9rem] text-[10px] uppercase leading-5 tracking-[0.18em] text-muted-foreground lg:block">UN SINGUR FLUX.<br />ZERO GHICIT.</p></div><div className="lg:pl-10"><div className="grid gap-10 md:grid-cols-[1.05fr_0.95fr] md:items-start md:gap-12"><div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">De ce SCENOTEHNICA</p><h2 className="mt-5 max-w-[9ch] text-5xl font-medium leading-[0.88] tracking-[-0.075em] sm:text-6xl lg:text-[4.5rem]">Mai puține telefoane.<br /><span className="text-primary">Mai mult control.</span></h2><a href={CONTACT_URL} target="_blank" rel="noreferrer" className="mt-8 inline-flex min-h-11 items-center gap-2 border-b border-foreground px-1 text-[10px] font-bold uppercase tracking-[0.12em] hover:border-primary hover:text-primary">Vorbește cu echipa <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a></div><div className="grid grid-cols-1">{(grouped.reasons.length > 0 ? grouped.reasons : ['Un singur furnizor', 'Consultanță înainte de eveniment', 'Prezență și backup', 'Experiență în producții diverse'].map((title, index) => ({ id: `fallback-reason-${index}`, content: title, parentId: null, fieldValues: { Titlu: title, Descriere: 'Sunet, lumini, video, scenă și echipă tehnică într-un singur plan.' } } as GenesisNode))).map((node, index) => <ReasonRow key={node.id} node={node} index={index} />)}</div></div></div></div></section>

      <section id="contact" className="border-t border-border bg-card/60"><div className="mx-auto grid min-h-[33rem] w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.62fr_1.38fr] lg:gap-0 lg:px-12"><div className="flex flex-col justify-between border-b border-border pb-10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8"><div className="space-y-3"><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">04</p><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">CONTACT</p></div><p className="hidden max-w-[9rem] text-[10px] uppercase leading-5 tracking-[0.18em] text-muted-foreground lg:block">URMĂTORUL CUE<br />POATE FI AL TĂU.</p></div><div className="grid min-w-0 gap-8 md:grid-cols-[0.82fr_1.18fr] md:items-start lg:gap-10 lg:pl-5"><div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Ai deja data și locația?</p><h2 className="mt-5 max-w-[9ch] break-words text-5xl font-medium leading-[0.88] tracking-[-0.075em] sm:text-6xl lg:text-[4.5rem]">Spune-ne contextul.<br /><span className="text-primary">Construim soluția.</span></h2><p className="mt-7 max-w-[20rem] text-[11px] leading-5 text-muted-foreground">Completează formularul oficial direct aici și trimite-ne detaliile evenimentului.</p><div className="mt-7 space-y-2 text-[11px] text-muted-foreground"><a href="tel:+40721259407" className="flex items-center gap-3 hover:text-primary"><CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />0721 259 407</a><a href="mailto:office@scenotehnica.ro" className="flex items-center gap-3 hover:text-primary"><FileText className="h-4 w-4 text-primary" aria-hidden="true" />office@scenotehnica.ro</a><p className="flex items-center gap-3"><span className="h-4 w-4 rounded-full border border-primary" aria-hidden="true" />Răspuns în cel mai scurt timp</p></div></div><div className="min-w-0 rounded-sm border border-border bg-background p-2.5 text-foreground shadow-xl shadow-foreground/5 sm:p-3"><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">Formular oficial</p><h3 className="mt-2 max-w-none text-3xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-4xl">Trimite solicitarea direct către Scenotehnica.</h3><p className="mt-2.5 text-[11px] leading-5 text-muted-foreground">Spune-ne data, locația și ce vrei să obții. Datele ajung direct în baza internă de solicitări.</p><div className="mt-2.5"><InquiryForm /></div></div></div></div></section>

      <footer className="border-t border-border bg-background"><div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><LogoLockup image /><span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Sunet · Lumini · Video · Scenă</span><div className="flex items-center gap-6 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><span>Bucharest / Romania</span><a href="#top" className="inline-flex items-center gap-2 font-bold text-primary hover:translate-x-1">Înapoi sus <ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a></div></div></footer>
    </main>
  );
}
