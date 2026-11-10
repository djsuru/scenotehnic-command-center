import type { DraggableProvided } from '@hello-pangea/dnd';
import { CalendarDays, GripVertical, MapPin, UserRound } from '@/lib/icons';
import { getFieldValue, getTitle, type GenesisNode } from '@/lib/genesis-data';

type RequestCardProps = {
  node: GenesisNode;
  selected: boolean;
  onSelect: (node: GenesisNode) => void;
  drag: DraggableProvided;
};

function dateLabel(value: string | null) {
  if (!value) return 'Dată nespecificată';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export default function RequestCard({ node, selected, onSelect, drag }: RequestCardProps) {
  const name = getTitle(node, 'Nume contact') ?? 'Solicitare fără nume';
  const company = getFieldValue(node, 'Companie') ?? 'Client individual';
  const eventType = getFieldValue(node, 'Tip eveniment') ?? 'Eveniment nespecificat';
  const eventDate = getFieldValue(node, 'Data evenimentului');
  const location = getFieldValue(node, 'Locație');
  const source = getFieldValue(node, 'Sursă') ?? 'Sursă nespecificată';
  const responsible = getFieldValue(node, 'Persoana responsabilă', '/attributes/@c8470');
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || '?';
  const hasEventDate = Boolean(eventDate);
  const hasLocation = Boolean(location);
  const hasResponsible = Boolean(responsible);

  return (
    <div ref={drag.innerRef} {...drag.draggableProps}>
      <article className={`overflow-hidden rounded-md border bg-card shadow-sm transition-colors ${selected ? 'border-primary ring-1 ring-primary/20' : 'border-border hover:border-primary/50'}`}>
        <div className="flex items-start gap-1 p-1">
          <button
            type="button"
            {...drag.dragHandleProps}
            aria-label={`Trage solicitarea ${name} într-o altă etapă`}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onSelect(node)}
            aria-label={`Deschide detaliile solicitării ${name}`}
            aria-pressed={selected}
            className="flex min-h-11 min-w-0 flex-1 items-start gap-3 p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold text-foreground">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold leading-5 text-foreground">{name}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">{company}</span>
              <span className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                <span className="max-w-full truncate rounded-sm bg-muted px-2 py-1 text-[10px] font-medium text-foreground">{eventType}</span>
                <span className="max-w-full truncate rounded-sm bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">{source}</span>
              </span>
              <span className="mt-2 grid gap-1 text-[11px] text-muted-foreground">
                {hasEventDate ? <span className="flex min-w-0 items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{dateLabel(eventDate)}</span></span> : null}
                {hasLocation ? <span className="flex min-w-0 items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{location}</span></span> : null}
                {hasResponsible ? <span className="flex min-w-0 items-center gap-1.5"><UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{responsible}</span></span> : null}
              </span>
            </span>
          </button>
        </div>
      </article>
    </div>
  );
}
