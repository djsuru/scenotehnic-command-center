# How to use: sign-in, roles and installed packages

The contract is `AGENTS.md`. This chapter holds sign-in and the package list.

## Sign-in (OIDC)

Add sign-in only when the app must know who each user is (accounts, per-user
data, team features). A single-purpose tool needs none. Never build a login
form or flow of your own.

```tsx
import { GenesisAuth } from '@/lib/genesis-auth';
import { useAuth } from 'react-oidc-context';

<GenesisAuth>
  <App />
</GenesisAuth>;

function Account() {
  const auth = useAuth();
  if (!auth.isAuthenticated) return <button onClick={() => void auth.signinRedirect()}>Sign in</button>;
  const { name, email } = auth.user?.profile ?? {};
  return <p>{name ?? email}</p>;
}
```

- `auth.signinRedirect()` opens the hosted sign-in and returns the user to the
  same page. Add no return flag and no bounce-back component.
- `signUpToApp()` from `@/lib/genesis-auth` opens the hosted create-account
  page and returns the same way. On an invite-only app that page creates no
  account. If an older `genesis-auth.tsx` has no `signUpToApp`, use
  `auth.signinRedirect({ prompt: 'create' })`.
- `signUpToApp({ email })` and `signInToApp({ email })` fill in a known email.
- `/login` and `/signup` open the hosted sign-in and create-account pages, so
  a plain link `<a href="/login">Log in</a>` works. `?next=/path` sets the page
  to return to. `GenesisNotFound` handles both, so keep the `path="*"` route,
  and a route of your own at `/login` or `/signup` wins.
- `auth.signoutRedirect()` signs out. `auth.user?.profile` holds `email`,
  `name`, `preferred_username`, `sub` and `role`.
- A visitor with no session is not an error: `auth.error` stays empty, so test
  `auth.isAuthenticated` and show the sign-in button. `auth.error` is a failed
  sign-in or renewal. A renewal that finds no session signs the user out with
  no error.

### When the owner requires sign-in

With "Require sign-in to use this app" on (Publish menu), the server refuses
every call from a visitor who is not signed in with 401. `GenesisRoot` then
shows a "Sign in to continue" screen over the app, in the app's colors, so add
no 401 handling of your own. `useSignupMode()` from `@/lib/genesis-auth`
returns `undefined` while it loads, then `'open'`, `'invite'` or `null`
(unknown). The screen offers "Create an account" only when the mode is
`'open'`.

### Admin and member pages

The owner makes each app user an Admin or a Member (the default) in App Users.
The token carries it as `role`. Never build a users table with a role column.

```tsx
import { RequireRole, useGenesisRole } from '@/lib/genesis-auth';

<Route path="/admin" element={<RequireRole role="admin"><AdminPage /></RequireRole>} />;
const role = useGenesisRole(); // 'admin' | 'member', or null when signed out
```

- `<RequireRole role="admin">` shows a member "This page is for admins. Ask
  the app owner for access." and a signed-out visitor the sign-in screen.
  `role="member"` admits every signed-in user.
- The role controls what the app shows, not what the server returns (unless
  the owner turns on "Admins see every row"). An admin page is not a security
  boundary.
- A role change reaches a signed-in user within 15 minutes.
- If an older `genesis-auth.tsx` lacks the helpers, check
  `auth.user?.profile.role === 'admin'`.

## Available Dependencies

### Core

- react 18, react-dom 18, typescript 5, tailwindcss 3

### UI & Styling

- **@radix-ui/react-\*** - Dialog, Dropdown Menu, Select, Switch, Tabs, Tooltip, Progress, Separator
- **lucide-react** - Icons, imported from `@/lib/icons`
- **framer-motion** 12 - The default for motion (`docs/02_theming.md`)
- **@fontsource-variable/\*** - Six web fonts, picked by a token (`docs/02_theming.md`)
- **next-themes** 0.4 - Dark mode
- **tailwind-merge** + **clsx** - `cn()` in `@/lib/utils`
- **class-variance-authority** 0.7 - Variants for a component with many states
- **@radix-ui/colors** 3 - Color scales

### Forms & Validation

- **react-hook-form** 7
- **@hookform/resolvers** 3 at runtime (the manifest declares 5)
- **zod** 3 at runtime (the manifest declares 4) - Use only zod APIs that exist in both majors.

### State & Routing

- **zustand** 4 - State (`createPersistentStore` adds localStorage)
- **react-router-dom** 7 - Routing
- **react-oidc-context** 3 - Sign-in client
- **axios** 1 - HTTP

### UI Components

- **cmdk** 1 - Command palette
- **sonner** 2 - Toasts
- **@hello-pangea/dnd** 18 - Drag and drop
- **@formkit/auto-animate** 0.8 - List animations
- **react-textarea-autosize** 8 - Growing textarea
- **react-intersection-observer** 9 - Visibility detection
- **react-error-boundary** 5 - Error boundaries

### Content & Data

- **react-markdown** 10 + **remark-gfm** 4 - Markdown
- **recharts** 2 - Charts
- **date-fns** 4 - Dates

### Maps

- **leaflet** + **react-leaflet** - Import `@/lib/leaflet-setup` from the map component

### AI Chat

- **@ai-sdk/react** - `useChat`
- **ai** - AI SDK core
- **ai-elements** - Chat UI parts at `@/components/ai-elements/`
- **ulidx** - Message ids
