# Agent contract

The rules for every edit to this app. The platform refuses every write to a
protected file (rules 1 and 3). If the app cannot work without such a change,
stop and say so.

## Rules

1. Work only in `src/` and the top-level `public/` folder
   (`docs/05_deployment_publish.md`). Never change config files,
   `src/main.tsx`, `src/styles/genesis-base.css`, `src/lib/genesis.tsx`,
   `src/lib/genesis-auth.tsx`, `src/lib/genesis-gateway.ts`,
   `src/lib/gateway-auth.tsx`, `src/lib/genesis-fonts.ts`,
   `src/lib/genesis-motion.tsx`, `src/lib/genesis-data/` or
   `src/lib/genesis-flows/`. Import from them.
2. Import only what is in this tree or `package.json`. You cannot add a
   dependency. Import icons from `@/lib/icons`: every real lucide-react name
   resolves, and an invented one fails the build. A Leaflet map component
   imports `@/lib/leaflet-setup` itself.
3. Never edit `src/components/ui/` or `src/components/blocks/`. `ui/` holds
   accessible widgets (Dialog, Sheet, Select, Popover, Tooltip). To give one
   the app's look, copy it into your own component under `src/components/`
   and restyle the copy.
4. `main.tsx` mounts the next-themes `ThemeProvider` (`attribute="class"`). Do
   not mount a second one. Toggle with `useTheme()`. Set the first-visit mode
   with `--genesis-default-theme: light;` (or `dark`, the default, or `system`,
   the visitor's OS mode) in the `:root` block of `src/index.css`, never with a
   `setTheme` call on mount. Read `resolvedTheme`: `theme` can be `system`.
5. Color comes from semantic tokens (`bg-card`, `text-muted-foreground`,
   `bg-primary/10`), never a literal palette class or raw hex. Chart classes
   are literals (`bg-chart-1` to `bg-chart-5`). Bind each chart `dataKey` and
   `nameKey` to a real row key: a wrong key draws an empty chart silently.
6. Read and write data only through `@/lib/genesis-data` (`getNodes`,
   `createNode`, `updateNode`, `deleteNode`, `uploadFile`, and `useLiveNodes`
   from `@/hooks/use-live-nodes`) and `@/lib/genesis-flows` (`submitForm`,
   `runFlow`, `getFlowRuns`). Rows arrive flat, so never filter on
   `parentId`. Read fields with `getFieldValue`, `getFieldNumber`,
   `getFieldLabel` and `getTitle`. Filter or count a Select with
   `isFieldOption(row, '@key', 'Open')`. Never compare a Select from
   `getFieldValue` with a literal. An intake form saves with `createNode`
   only: one submit, one writer. Call `runFlow` and `submitForm` on a click,
   never on a timer. Detail: `docs/01_data_layer.md`.
7. Keep API keys on the server: call a keyed third-party API through
   `GenesisClient.proxy()` with the `{{secret}}` placeholder.
8. The app shows its agent: `<FloatingAgentChat agentId publicAgentId? />`
   from `@/components/blocks` in the app's own form and look, or the SDK v2
   split. Never link to a relative `/a/...` URL: that route exists only on
   www.taskade.com. Detail: `docs/04_agent_chat.md`.
9. For sign-in, wrap the app in `<GenesisAuth>` from `@/lib/genesis-auth`.
   Never build your own login flow. Detail: `docs/HOW_TO_USE.md`.
10. Never `new` an import that shadows a global constructor (`Map`, `Set`,
    `Date`, `Image`). `import { Map } from 'lucide-react'` makes `new Map()`
    throw and blanks the app. Rename it: `Map as MapIcon`.
11. Every entity or section that the user names gets its own page in
    `src/pages/`, routed in `App.tsx` and reachable in one step.
    `src/pages/HomePage.tsx` is the placeholder that the preview shows while
    the app builds: replace it, or route `/` to the real home page.
    Keep the `path="*"` route (`GenesisNotFound`) last.
12. A hand-written form carries `data-genesis-form` on the `<form>`,
    `data-genesis-field="<field name>"` on each field wrapper,
    `data-genesis-submit` on the submit button and `data-genesis-next` on the
    next-step button. Platform QA drives the form through them.

## Design

- Write every visible surface (layout, navigation, hero, cards, lists,
  controls) by hand in plain Tailwind, in the app's own look.
- Navigation is part of the composition, never a template bar
  (`docs/03_routing_pages.md`).
- Atmosphere comes from tokens: a wash from `--primary`, glass tiles
  (`bg-card/60 backdrop-blur-md border border-border/60`) and tinted icon
  wells (`bg-primary/10`). Body text keeps 4.5:1 contrast.
- Motion is framer-motion by default: sections reveal on arrival, cards lift on
  hover (`whileHover`), removed rows exit (`AnimatePresence`), and a `layoutId`
  pill slides to the active tab. When `useReducedMotion()` is true, render the
  final state. `@/lib/genesis-motion` has ready helpers.
- On an edit, keep the app's header, theme, components and layout.

Worked page with all of the above: `docs/examples/polished-list-page.md`.

## Read more

| Job                                                 | File                                  |
| --------------------------------------------------- | ------------------------------------- |
| Rows, fields, flows, uploads, secret proxy          | `docs/01_data_layer.md`               |
| Tokens, dark mode, charts, fonts, motion helpers    | `docs/02_theming.md`                  |
| Router, pages, navigation                           | `docs/03_routing_pages.md`            |
| Agent chat, the two ids, past chats                 | `docs/04_agent_chat.md`               |
| Preview vs published, `public/` files               | `docs/05_deployment_publish.md`       |
| Sign-in, roles, installed packages                  | `docs/HOW_TO_USE.md`                  |
| A finished page to copy from                        | `docs/examples/polished-list-page.md` |
| Block props and adapters                            | `src/components/blocks/README.md`     |
