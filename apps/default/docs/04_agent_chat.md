# 04 - Agent chat

Every Genesis app shows its agent. Use the block by default, or the SDK v2
split for a chat UI of your own (`src/lib/agent-chat/v2/README.md`).

## The block: `FloatingAgentChat`

```tsx
import { FloatingAgentChat } from '@/components/blocks';

<FloatingAgentChat agentId={AGENT_ID} publicAgentId={PUBLIC_AGENT_ID} />;
```

It owns the SDK wiring, streaming, retry and the hosted fallback, and renders
nothing when both ids are absent. It reads the agent's public profile, so the
title, starter chips, placeholder, welcome text, accent color and emoji match
the hosted `/a/` page with no props. Pass a prop (props table:
`src/components/blocks/README.md`) only to differ from the profile.

Render it once in `App.tsx`, under `<BrowserRouter>`. To keep it off
checkout and pricing, hide it, never unmount it (an unmount drops an open
conversation):

```tsx
function AppChat() {
  const { pathname } = useLocation();
  return (
    <div hidden={/^\/(checkout|pricing)(\/|$)/.test(pathname)}>
      <FloatingAgentChat agentId={AGENT_ID} publicAgentId={PUBLIC_AGENT_ID} />
    </div>
  );
}
```

`(\/|$)` ends the match at the segment: `/checkout/pay` hides the chat, and
`/checkout-faq` keeps it. The panel has its own header (avatar, title, close),
so do not wrap it in a header or card. Use `position="bottom-left"` when the
app's own action sits bottom right.

## Give the chat this app's form and look

A stock corner bubble reads as a template. Pick the form from the design:

- Floating, restyled with `icon`, `launcherText`, `launcherClassName` and
  `panelClassName`: a helper beside the main job.
- `variant="inline"` in a box with a height (`h-[560px]`): a coach or a
  concierge section.
- `variant="inline"` as its own tab or route (`h-[calc(100dvh-4rem)]`): the
  agent is the product.
- `variant="inline"` in the app's own `<aside>` or drawer: work apps and
  dashboards.

```tsx
<FloatingAgentChat
  agentId={AGENT_ID}
  publicAgentId={PUBLIC_AGENT_ID}
  icon={<Leaf className="size-5" />}
  launcherText="Chat"
  launcherClassName="gap-2 rounded-2xl bg-gradient-to-br from-chart-1 to-chart-3 text-primary-foreground"
  panelClassName="rounded-2xl border-primary/30 shadow-2xl backdrop-blur-md"
/>
```

Keep the launcher small. On a phone it shows the icon only, because a wide
button covers the content. From `sm` up it shows the icon and `launcherText`.
Make that text one short word in the app's language ("Chat", "Coach",
"Ayuda"), never a sentence such as "Ask the assistant". Leave the size to the
block: a height, width or padding in `launcherClassName` applies on phones too.

On a phone a corner launcher covers a control in the first view (a select, a
row button, a call to action). Below `sm`, hide the launcher and open the same
chat from a 44px icon button in the app header, styled like the theme toggle.
The header button clicks the launcher, so the block keeps the conversation and
the panel. Show the header button only on the routes that mount the chat.

```tsx
<FloatingAgentChat agentId={AGENT_ID} publicAgentId={PUBLIC_AGENT_ID} launcherClassName="max-sm:hidden" />

// In the app header, before the theme toggle:
<Button
  variant="ghost"
  size="icon"
  className="size-11 sm:hidden"
  aria-label="Open chat"
  onClick={() => document.querySelector<HTMLButtonElement>('button[data-genesis-chat]')?.click()}
>
  <MessageCircle className="size-5" />
</Button>
```

An inline chat creates its conversation on the first send. Style it through
props and tokens: the file tools refuse a write under `src/components/blocks/`.

## The two ids

| Prop            | What it is                                                       | Drives            |
| --------------- | ---------------------------------------------------------------- | ----------------- |
| `agentId`       | the SpaceAgent id from the CreateAgent result                    | the in-app SDK    |
| `publicAgentId` | the last segment of the public `/a/{publicAgentId}` URL          | the hosted fallback |

The `/a/` id as `agentId` gives 404. The agent must be public, or the chat
fails with "Public agent not found". Never link to a relative `/a/...` URL:
that route exists only on www.taskade.com, and on the app's origin it opens a
blank page.

## Your own chat UI: the SDK v2 split

`useChat` crashes on an `undefined` chat. Create the chat first, then render
the component that calls the hook:

```tsx
import { useChat } from '@ai-sdk/react';
import { createConversation, createAgentChat } from '@/lib/agent-chat/v2';
import { ulid } from 'ulidx';

type AgentChat = ReturnType<typeof createAgentChat>;

function ChatLauncher() {
  const [chat, setChat] = useState<AgentChat | null>(null);
  const start = async () => {
    const { conversationId } = await createConversation(AGENT_ID);
    setChat(createAgentChat(AGENT_ID, conversationId));
  };
  if (chat == null) return <button onClick={() => void start()}>Start chat</button>;
  return <ActiveChat chat={chat} />;
}

function ActiveChat({ chat }: { chat: AgentChat }) {
  const { messages, status, stop, error, addToolApprovalResponse } = useChat({ chat, id: chat.id });
  return (
    <AIAssistantPanel
      messages={messages}
      onSend={(text) => chat.sendMessage({ id: ulid(), role: 'user', parts: [{ type: 'text', text }] })}
      status={status}
      onStop={stop}
      errorMessage={error != null ? 'Something went wrong. Try again.' : undefined}
      onApprove={(id, approved) => addToolApprovalResponse({ id, approved })}
    />
  );
}
```

`AIAssistantPanel` comes from `@/components/blocks`. You can also compose
`@/components/ai-elements/*` yourself.

## Past chats

A public chat has no user identity, so the API cannot list an agent's chats.
Store each `conversationId` that `createConversation` returns
(`createPersistentStore` or `localStorage`). Ignore the `nonce`: the SDK keeps
it and sends it on every read, which ties a transcript to its browser.
`<FloatingAgentChat />` stores no ids, so a history page owns
`createConversation` itself.

- `listConversations(agentId, storedIds)` returns metadata for ids you hold
  (at most `PUBLIC_CONVERSATION_LIST_MAX_IDS`).
- `getConversation(agentId, id)` returns user and assistant text, newest page
  first. Pass `nextCursor` as `cursor` for older turns.
- To continue a stored chat, pass its id to `createAgentChat`, and render the
  old turns from `getConversation` above the live panel.

```tsx
const useChatIds = createPersistentStore<{ ids: string[]; remember: (id: string) => void }>(
  'my-app:agent-chat-ids',
  (set) => ({ ids: [], remember: (id) => set((s) => (s.ids.includes(id) ? s : { ids: [...s.ids, id] })) }),
);
// After createConversation: useChatIds.getState().remember(conversationId);
```

If `@/lib/agent-chat/v2` does not export these helpers, the app cannot read
history: tell the user and ship no History tab.

## Rules that prevent the known chat bugs

- Disable Send and the starter chips until `createConversation` resolves.
- Every `catch` sets a visible error line with a retry. Render `useChat`'s
  `error` too.
- In a `flex h-full flex-col` panel, the list is
  `min-h-0 flex-1 overflow-y-auto` and the composer is its sibling.
- Render text parts and `isToolUIPart(part)` parts. A tool row shows "Working
  on it..." while it runs and nothing on success, never the tool name or its
  data. `output-error` shows "Something went wrong", `output-denied`
  "Skipped".
- Approve with `addToolApprovalResponse({ id: part.approval.id, approved })`,
  never `toolCallId`.
- Message ids come from `ulid()`. Busy is
  `status === 'submitted' || status === 'streaming'`. The composer stays
  `resize-y`.
- Scroll to the end only when the reader is at the end, never on every token
  and never smooth. Record "at the end" in the scroll handler, before new
  content arrives. `AIAssistantPanel` and `Conversation` already do this.
- A custom panel is full width on phones and a corner panel from `sm:` up.
