# 03 - Routing and pages

`react-router-dom` 7 with `BrowserRouter`. A published app serves `index.html`
for every path that is not a file, so deep links and refreshes work.

## The shell

`src/App.tsx` is the router, the shared layout and the routes, nothing more.
Each page is its own `src/pages/*.tsx` file. Mount app-wide pieces once here:
the agent chat and `<Toaster />` from `@/components/ui/sonner` (without it, no
toast shows). `src/pages/HomePage.tsx` is the placeholder that the preview
shows while the app builds: replace it, or point `/` at the real home page.

## Add a page

1. Create `src/pages/NewPage.tsx` with a `default` export.
2. In `App.tsx`: `const NewPage = lazy(() => import('@/pages/NewPage'));`
3. Add `<Route path="/new" element={<GenesisSection name="New"><NewPage /></GenesisSection>} />`.
4. Link with `<Link>`, `<NavLink>` or `useNavigate()`, never `<a href>` (a full
   reload loses state).

`GenesisSection` (from `@/lib/genesis`) wraps every route: a throw in one
section shows one "this section hit an error" card with a retry, and the rest
of the app keeps working. It resets on navigation. Pass `resetKeys` only to
reset on something else too.

## Unknown addresses

The last route in `App.tsx` is `<Route path="*" element={<GenesisNotFound />} />`.
It shows "This page does not exist" with a "Go to the home page" button. Keep
it last, after every page route. To show your own not-found page, change its
element, and keep one `path="*"` route only. Never send an unknown address to
the home page. Inside `<GenesisAuth>`, `GenesisNotFound` also opens the hosted
sign-in page at `/login` and the create-account page at `/signup`.

The shell also gives every app its loading and error states. A lazy page
shows a quiet loader in the app's colors while it loads, and a crash shows a
plain message with a Reload button. Design the loading and empty states of
your own data inside each page.

## Navigation is part of the composition

Pick the shape from the jobs, not from a template: a wordmark with inline
links, tabs inside the content with a `layoutId` pill, a quiet side rail, a
bottom tab bar on phones, or no navigation on a one-job page. A `Sheet` menu is
one option on a phone, not the default. A theme toggle needs no header slot.
Make a header sticky only on a page longer than one screen. On an edit, keep
the app's header.

```tsx
<header className="mx-auto flex max-w-5xl items-baseline gap-8 px-6 pt-10">
  <Link to="/" className="font-display text-xl tracking-tight">Field Notes</Link>
  <nav className="flex gap-1 text-sm">
    {LINKS.map((link) => (
      <NavLink key={link.to} to={link.to} className="relative rounded-full px-3 py-1.5 text-muted-foreground aria-[current=page]:text-foreground">
        {({ isActive }) => (
          <>
            {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-primary/10" />}
            <span className="relative">{link.label}</span>
          </>
        )}
      </NavLink>
    ))}
  </nav>
</header>
```

## Files

Your code goes in `src/pages/`, `src/components/`, `src/hooks/` and
`src/stores/` (zustand, with `createPersistentStore` for localStorage).

## Reserved paths

Never create a route at `/api/taskade/*` (data gateway), `/_taskade/*`
(internal API) or `/_genesis/*` (sign-in).
