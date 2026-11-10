# Components map

Write every visible surface yourself, in plain Tailwind and framer-motion, in
the app's own look. Put your components in `src/components/`. The three
folders below are read-only.

| Folder         | Holds                                                                       | Use                                                                                         |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `ui/`          | Accessible widgets: Dialog, Sheet, Select, Popover, DropdownMenu, Tooltip, Calendar | Copy a widget into your own component and restyle the copy. Keep `ui/chart` and `ui/sonner` as they are. |
| `ai-elements/` | Chat UI parts: Conversation, Message, PromptInput, Suggestion, Tool, Reasoning | Build a custom chat UI (`src/lib/agent-chat/v2/README.md`).                                 |
| `blocks/`      | Optional plumbing: FloatingAgentChat, LeadCaptureForm, AIAssistantPanel     | Agent chat and intake wiring, never the main surface. Props in, callbacks out (`blocks/README.md`). |
