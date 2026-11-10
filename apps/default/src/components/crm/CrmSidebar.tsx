import { NavLink } from 'react-router-dom';
import {
  CalendarDays,
  ChartNoAxesColumn,
  ClipboardList,
  Columns3,
  FileCheck2,
  FileText,
  HardHat,
  LayoutDashboard,
  Settings,
} from '@/lib/icons';

const sections = [
  { label: 'Command Center', icon: LayoutDashboard, to: '/command-center' },
  { label: 'Lead Nou', icon: Columns3, to: '/crm' },
  { label: 'Oferta', icon: FileText, to: '/oferta' },
  { label: 'Event Calendar', icon: CalendarDays, to: '/event-calendar' },
  { label: 'Contracts', icon: FileCheck2 },
  { label: 'Finance', icon: ChartNoAxesColumn },
  { label: 'Admin Planning', icon: ClipboardList },
  { label: 'Tehnic', icon: HardHat },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

export default function CrmSidebar() {
  return (
    <aside aria-label="Navigare SCENOTEHNICA" className="border-b border-sidebar-border bg-sidebar p-3 text-sidebar-foreground md:fixed md:inset-y-0 md:left-0 md:z-30 md:w-[264px] md:overflow-y-auto md:border-b-0 md:border-r md:p-5">
      <div className="mb-4 hidden border-b border-sidebar-border px-2 pb-4 md:block">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-primary">SCENOTEHNICA</p>
        <p className="mt-1 text-xs text-sidebar-foreground/65">Spațiu de lucru</p>
      </div>
      <nav aria-label="Secțiuni" className="grid grid-cols-1 gap-2">
        {sections.map(({ label, icon: Icon, to }) => (
          <div key={label}>
            {to ? (
              <NavLink
                to={to}
                end
                className={({ isActive }) => `flex min-h-11 min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${isActive ? 'border-sidebar-primary/50 bg-sidebar-accent font-semibold text-sidebar-accent-foreground' : 'border-primary/20 bg-primary/5 text-sidebar-foreground hover:border-sidebar-primary/40 hover:bg-sidebar-accent/60'}`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{label}</span>

              </NavLink>
            ) : (
              <div aria-disabled="true" title="Secțiune planificată pentru o etapă următoare" className="flex min-h-11 min-w-0 items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-sidebar-foreground/75">
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-wide text-sidebar-foreground/55">Curând</span>
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
