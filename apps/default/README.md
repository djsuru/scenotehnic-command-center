# Genesis Base Template v2

React 18, TypeScript, Tailwind CSS 3 and framer-motion. Every Genesis app
starts from this tree. Read `AGENTS.md` first. Import with `@/`.

```
src/
├── App.tsx              # Router shell: routes and shared layout only
├── pages/               # One file per route. HomePage.tsx is the build placeholder
├── main.tsx             # Fixed entry: error boundary, ThemeProvider, MotionConfig
├── index.css            # Theme tokens: the one file a retheme changes
├── components/
│   ├── ui/              # Accessible widgets to copy and restyle (read-only)
│   ├── ai-elements/     # Chat UI parts (Conversation, Message, PromptInput)
│   └── blocks/          # Optional plumbing (FloatingAgentChat, LeadCaptureForm)
├── hooks/               # use-live-nodes, use-theme, use-mobile, use-toast
└── lib/                 # genesis-* SDKs (read-only), utils.ts (cn), icons.ts,
                         # createPersistentStore.ts, agent-chat/v2
```

| Layer        | Taskade source | The app uses it through                                    |
| ------------ | -------------- | ---------------------------------------------------------- |
| Data         | projects       | `@/lib/genesis-data` (`docs/01_data_layer.md`)             |
| Automation   | flows          | `@/lib/genesis-flows` (`docs/01_data_layer.md`)            |
| Intelligence | agents         | `<FloatingAgentChat />` or SDK v2 (`docs/04_agent_chat.md`) |
| Interface    | this template  | hand-written Tailwind and framer-motion (`AGENTS.md`)      |
