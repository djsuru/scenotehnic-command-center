# Blocks: optional plumbing

Blocks wire commodity jobs: the agent chat and an intake submit. They are not
the app's look. Write the dashboard and every surface that people see first by
hand. On an edit, keep the blocks that the app already uses.

Import from `@/components/blocks` (or a folder, `@/components/blocks/agent-chat`).
Data goes in through props, after you fetch it in the page or a hook, and
events come out through callbacks. Only `FloatingAgentChat` does network work.
Never edit a block file: it rethemes through the tokens in `src/index.css`.

`colorIndex` is always `1 | 2 | 3 | 4 | 5`. `className` passes through where
listed. Every prop not marked "required" is optional.

## FloatingAgentChat

The full agent chat: launcher, panel, SDK wiring, retry and hosted fallback.
It renders nothing when both ids are absent. Placement and forms:
`docs/04_agent_chat.md`. Each default comes from the agent's public profile,
and each prop wins over it.

- `agentId`: the SpaceAgent id, which drives the SDK. Never the `/a/` id.
- `publicAgentId`: the last segment of the `/a/...` URL, for the fallback.
- `title`: default the agent's header title, then its name, then `'Assistant'`.
- `accent` (`colorIndex`, wins over every hex color) or `accentColor` (hex,
  default the agent's color, then `bg-primary`).
- `suggestions: readonly (string | { text, prompt })[]`, `placeholder`,
  `emptyDescription`, `footerText`, `notice`: default from the agent.
- `labels: Partial<FloatingAgentChatLabels>`: English strings for close,
  retry, connecting and tool status.
- `position: 'bottom-right' | 'bottom-left'` (default `'bottom-right'`).
- `variant: 'floating' | 'inline'` (default `'floating'`). `inline` has no
  launcher and no close button, fills its parent, and creates the
  conversation on the first send.
- `icon: ReactNode` (default the agent's emoji or image), `launcherText`
  (one short word in the app's language, shown from `sm` up: a phone shows
  the icon only), `launcherClassName` (shape, gradient), `panelClassName` (surface,
  border, radius, shadow, font), `defaultOpen` (false), `className`.

To keep it off checkout and pricing, hide it in a small component inside
`<BrowserRouter>` that reads `useLocation()`:
`<div hidden={/^\/(checkout|pricing)(\/|$)/.test(pathname)}><FloatingAgentChat ... /></div>`.
Never unmount it: that drops an open conversation.

```tsx
<FloatingAgentChat
  agentId={AGENT_ID}
  publicAgentId={PUBLIC_AGENT_ID}
  icon={<Swords className="size-5" />}
  launcherText="Coach"
  launcherClassName="gap-2 rounded-md bg-gradient-to-r from-chart-1 to-chart-2 text-primary-foreground"
  panelClassName="rounded-md border-primary/40 font-mono"
/>
```

## AIAssistantPanel

The chat panel only: the host owns `useChat` (`docs/04_agent_chat.md`). A tool
row shows "Working on it..." while it runs and nothing on success, never the
tool name, input or output.

- `messages: UIMessage[]` and `onSend: (text) => void | Promise<void>`
  (required).
- `busy`, `status: ChatStatus`, `onStop`, `onApprove: (id, approved) => void`
  (`id` is `part.approval.id`).
- `suggestions` (default `DEFAULT_ASSISTANT_SUGGESTIONS`), `title`,
  `placeholder`, `emptyTitle`, `emptyDescription`, `className`.
- `hideHeader` (only inside your own header), `emptyStateAlign: 'start' | 'end'`.

## LeadCaptureForm / ThankYou

A Zod-checked intake form, one page or multi-step, with a success state. It
never sends anything: `onSubmit` does.

- `onSubmit: (values: Record<string, string | boolean>) => void | Promise<void>`
  (required, awaited: a rejection keeps the form with an error).
- `variant: 'lead' | 'contact' | 'newsletter'` (default `'lead'`) picks the
  default fields. `fields: LeadField[]` (`{ name, label, type, required?,
  placeholder?, options? }`, type text, email, tel, textarea, select or
  checkbox). `steps: { title, fields }[]` for multi-step.
- `title`, `description`, `submitLabel` (`'Submit'`), `successTitle`,
  `successMessage`, `submitting`, `success`.
- `ThankYou`: `{ title?, message?, onReset? }`.

Save with `createNode` only: one submit, one writer. Map each value onto the
project's exact field name, because the gateway drops unknown keys.

```tsx
<LeadCaptureForm
  onSubmit={(v) => createNode(LEADS_ID, { Name: String(v.name ?? ''), Email: String(v.email ?? ''), Status: 'New' })}
/>
```

## ArtImage

One generated art file (black line art on white paper, a data URI in
`src/assets/art/<name>.ts`) with a correct light and dark look. Import the
module and pass it. Never open or edit the art file.

- `art: { src, width, height, alt }` (required): `import * as hero from '@/assets/art/hero'`.
- `photo` (false): set true for a photo. A photo takes no filter.
- `className`, `style`: set a fixed size box (for example `h-40 w-full`) so
  that the page does not shift when the image loads.

```tsx
import * as hero from '@/assets/art/hero';

<ArtImage art={hero} className="h-[200px] w-full md:h-[200px]" />
```

## Data blocks (for apps that already use them)

- `RecordsTable`: `rows: RecordRow[]` (`{ id; [key]: string | number }`) and
  `columns` (`{ key, header, sortable?, align?, render? }`) required.
  `statusField`, `statusColors: Record<string, StatusBucket>`, `searchable`
  (true), `filterField`, `ownerField` + `viewerId` (display only, not
  privacy), `actions: { label, icon?, onSelect, variant? }[]`, `onRowOpen`,
  `title`, `emptyText`, `emptyDescription`, `loading`.
- `PipelineBoard`: `stages: { id, label, colorIndex? }[]` (order = workflow,
  `id` = status value) and `cards: { id, title, subtitle?, stageId, meta? }[]`
  required. `onMove(e)` persists (`{ cardId, fromStageId, toStageId, toIndex }`),
  `onStageChange`, `title`.
- `MetricsDashboard`: `cards: MetricCardData[]` required, `title`, `subtitle`,
  `goals`, `quickStats: { label, value, colorIndex? }[]`,
  `trend: { name, value }[]`, `loading`. `MetricCard` is
  `{ label, value, change?, trend?: 'up' | 'down', icon?, colorIndex? }`.
  `GoalBar` is `{ name, current, target, colorIndex? }`.
- `StatusTracker`: `items: { id, label, status, done?, group?, owner?,
  dueDate?, meta? }[]` required. `title`, `groupBy`, `showProgress` (true),
  `statusColors`, `onToggle(item, done)`, `emptyText`.
- `InvoiceCard`: `invoice: { id, number, status, issueDate?, dueDate?,
  billTo: { name, email?, address? }, lineItems: { id, description, qty,
  unitPrice }[], taxRate?, currency? }` required. `onMarkPaid(id)`,
  `onSend(id)`. Totals and currency come from the block.
- `PortalShell`: `brand: { name, logo? }`, `sections: { id, label, icon? }[]`
  and `children` required. `viewer`, `activeSection`, `onSectionChange`,
  `onSignOut`, `showOwnerNote` (true). It does no sign-in.

## Adapters: `GenesisNode[]` to props

Pure functions in each `fromNodes.ts`. They read through `getFieldValue` and
`getFieldNumber` and never fetch. A key can be the display name, the field
path or the bare `@key`. Numbers fall back to 0. A Select reads as its label
on the display name and as its option id on the field path.

- `nodesToMetrics(nodes, { labelField, valueField, changeField?, trendField?, colorIndex? })`
- `nodesToGoals(nodes, { nameField, currentField, targetField, colorIndex? })`
- `nodesToRecords(nodes, config)` and `recordsColumns(config)`, config
  `{ fields, headers?, sortable?, numericFields?, statusField? }`
- `filterByOwner(rows, ownerField, viewerId)`: display only
- `nodesToCards(nodes, { statusField, titleField, subtitleField?, metaFields?, metaLabels? })`
  and `toStages(stageIds, labels?)`. A card goes to the stage whose id or
  label matches its `stageId`, in any case.
- `nodeToLeadDefaults(node, fields)`, `scoreLead(values, rules, thresholds?)`
- `nodesToChecklist(nodes, { labelField, statusField, groupField?, ownerField?, doneStatuses? })`:
  list labels in `doneStatuses` for a display name, option ids for a field path
- `nodeToInvoice(invoiceNode, lineItemNodes, fieldMap)`

Example data, never used unless you pass it: `SERVICE_PRO_JOB_*`,
`ACTIVITY_LOG_*`, `DEAL_PIPELINE_*`, `TRIAGE_QUEUE_*`, `BUYER_PIPELINE_*`,
`REAL_ESTATE_LEAD_*`, `DEFAULT_LEAD_THRESHOLDS`, `SCORE_LEAD_WIRING`,
`RECEIVING_CHECKLIST_ITEMS`, `ONBOARDING_CHECKLIST_ITEMS`,
`SERVICE_PRO_INVOICE`, `CLIENT_PORTAL_SECTIONS`,
`DEFAULT_ASSISTANT_SUGGESTIONS`.
