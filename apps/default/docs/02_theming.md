# 02 - Theming and motion

All color flows through CSS variables in `src/index.css`. Components use
semantic classes, so a retheme changes values and no component. A literal
palette class (`bg-blue-500`) or a raw hex value survives a retheme and
clashes.

## Tokens

HSL triples on `:root` (light) and `.dark` (dark):

| Classes                                          | For                            |
| ------------------------------------------------ | ------------------------------ |
| `bg-background text-foreground`                  | the page                       |
| `bg-card text-card-foreground`                   | surfaces and tiles             |
| `bg-primary text-primary-foreground`             | actions, live data, key values |
| `bg-secondary`, `bg-muted text-muted-foreground` | quiet surfaces, detail text    |
| `bg-accent text-accent-foreground`               | hover and selection tint       |
| `bg-destructive`                                 | delete and error               |
| `border-border`, `ring-ring`                     | lines and focus rings          |
| `bg-popover text-popover-foreground`             | menus and popovers             |

`--radius` sets the corner scale. Glass, washes and glows use the same tokens
with an alpha (`bg-card/60`, `from-primary/20`,
`shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.45)]`), so light mode relights
the scene.

Theme tokens live only in the `:root` and `.dark` blocks inside `@layer base`
in `src/index.css`. Change their values there, never in a new rule. The Theme &
Brand panel reads and writes only those two blocks, so a token set anywhere
else locks the owner out of it. For an app the owner wants light only, write
the light values into both blocks. Keep each text pair at 4.5:1 in both modes.

## Chart colors

`--chart-1` to `--chart-5` give `bg-chart-N`, `text-chart-N` and
`'hsl(var(--chart-N))'` for a Recharts series. Tailwind sees only literal class
names: map an index with
`{ 1: 'bg-chart-1', 2: 'bg-chart-2', 3: 'bg-chart-3', 4: 'bg-chart-4', 5: 'bg-chart-5' }`.
Route chart tooltips through `@/components/ui/chart` (`ChartContainer`,
`ChartTooltip content={<ChartTooltipContent />}`), which keeps them legible.

## Dark mode

- `main.tsx` mounts next-themes (`attribute="class"`). Do not mount a second
  provider. An older app with its own provider keeps it, because `ThemeGate`
  steps aside.
- The first-visit mode is `--genesis-default-theme` in `:root`: `dark` (also
  when absent), `light`, or `system` (the visitor's OS mode, where new apps
  start). A later pick by the visitor wins. A `setTheme` call on mount is
  lost. Read the mode from `resolvedTheme`, because `theme` can be `system`.
- `.dark` on `<html>` flips every token, so write no `dark:` override for a
  token. Toggle with `useTheme()` from `next-themes` or `@/hooks/use-theme`.

`src/styles/genesis-base.css` (read-only) is the floor: focus rings, tap
handling, a 180 ms ease on control colors, borders and shadows, one ease-out
curve on menu, popover, select and dialog enter and exit, a short fade-in of
`<main>`, and a reduced-motion reset. Its specificity is 0, so your classes
win. One exception: a native `<select>` gets
a caret 12px from the edge and `2.5rem` of right padding that beats `px-*`.
Write `appearance-none` on a select only when you draw its caret yourself.

## Fonts

The system stack is the default. `src/lib/genesis-fonts.ts` declares six
variable web fonts. A browser loads a family only when a token names it. Where
the platform turns web fonts off, the token renders its fallback, so end each
token with one.

| Family in CSS               | For                         |
| --------------------------- | --------------------------- |
| `'Inter Variable'`          | neutral interface text      |
| `'Geist Variable'`          | technical product interface |
| `'Space Grotesk Variable'`  | bold display headings       |
| `'Nunito Variable'`         | rounded, friendly, playful  |
| `'Fraunces Variable'`       | editorial serif headings    |
| `'JetBrains Mono Variable'` | code, data, terminals       |

Set one or two in `:root` (`.dark` inherits them). `font-sans`, `font-display`
(falls back to `--font-sans`) and `font-mono` read them. No other font package
is installed.

```css
--font-sans: 'Inter Variable', ui-sans-serif, system-ui, sans-serif;
--font-display: 'Fraunces Variable', ui-serif, Georgia, serif;
```

## Motion

framer-motion is the default. `main.tsx` wraps the app in
`<MotionConfig reducedMotion="user">`. Also read `useReducedMotion()`, and when
it is true render the final state (`initial={reduce ? false : ...}`). Give a
decorative `animate-*` class `motion-reduce:animate-none`.

`@/lib/genesis-motion` (read-only) has helpers on one spring with no bounce
(about 350 ms): `Reveal` (`delay`), `Stagger` (`step`, default 0.05 s) with
`StaggerItem`, `HoverLift`, `Presence` (keyed children enter and exit,
`mode="popLayout"` or `"wait"`), `SavePulse` (pulses when `pulseKey` changes)
and `Collapse` (`open`, opens by height, padding on its children). The worked
page `docs/examples/polished-list-page.md` writes the same moves in
framer-motion directly.

`src/lib/theme-bridge.ts` applies live theme edits from the Taskade editor
through the token names above, so never rename or bypass them.
