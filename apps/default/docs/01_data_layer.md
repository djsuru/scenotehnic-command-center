# 01 - Data layer

The app reads and writes its Taskade project rows through the gateway at
relative `/api/taskade/*` paths. The proxy adds the credentials on the server.
Use the helpers below, never a hand-built gateway URL.

## Project rows: `@/lib/genesis-data`

```ts
import {
  getNodes, createNode, updateNode, deleteNode,
  getFieldValue, getFieldLabel, getFieldNumber, getTitle,
} from '@/lib/genesis-data';

const rows = await getNodes(PROJECT_ID); // GenesisNode[]
const title = getTitle(rows[0], 'Name', 'Title') ?? 'Untitled';
const status = getFieldValue(rows[0], 'Status'); // string | null
const score = getFieldNumber(rows[0], 'Score') ?? 0; // never NaN
await createNode(PROJECT_ID, { Name: 'Maria', Status: 'New' });
await updateNode(PROJECT_ID, rows[0].id, { Status: 'Contacted' }); // partial
await updateNode(PROJECT_ID, rows[0].id, { Due: null }); // null clears a field
await deleteNode(PROJECT_ID, rows[0].id);
```

`GenesisNode` is `{ id; fieldValues: Record<string, string>; parentId: string | null; content?; createdAt? }`.

- `getNodes` returns every row in one flat array. In a flat project each row
  has `parentId === null`, so a filter on `parentId` returns nothing.
- Read fields with `getFieldValue(row, ...keys)` and
  `getFieldNumber(row, ...keys)`, never `fieldValues[...]`. They try each key
  in turn (the display name first, then the field path).
- For a Select, `getFieldLabel(row, '@key')` returns the option name.
  `getFieldValue` on the field path returns the option id.
- To filter, count or branch on a Select, call
  `isFieldOption(row, '@key', 'Open')` with the option name. The name matches
  in every mode, and an id matches except in an app pinned to label output. The
  case, spaces and punctuation do not count:
  `rows.filter((r) => isFieldOption(r, '@statu', 'Open'))`. Never
  compare `getFieldValue` of a Select with a literal. To group rows, group by
  `getFieldLabel(row, '@key')`. Give each option a name that no other option
  uses as its id or its name.
- Show a row's name with `getTitle(row, ...keys)`. It falls back to the node
  text (`content`) only when no named field has a value. `content` is for
  display only: never filter or sort on it.
- `createdAt` is the insert time (ISO 8601, UTC), set by the server. Do not add
  a `Created` field. Newest first:
  `(b.createdAt ?? '').localeCompare(a.createdAt ?? '')`.
- A date field with no time reads as `YYYY-MM-DD`. Parse it with `parseISO`
  (date-fns), not `new Date()`, which reads it as UTC midnight (a day early).

## Screens that stay open: `useLiveNodes`

A dashboard, board, queue or inbox reads with `useLiveNodes(projectId)` from
`@/hooks/use-live-nodes`. It checks again when the person returns and on a
slow timer, and an unchanged project costs no render. Call `refresh()` after a
write.

```tsx
const { nodes, loading, error, updatedAt, refresh } = useLiveNodes(projectId);
// updatedAt: epoch ms (a number, not a Date). Format it with new Date(updatedAt).
```

`error` means that the last check failed, and the hook keeps the last good
rows. `updatedAt` is null only until the first good load. Show the loud error
card only when `error && updatedAt == null`. With rows on screen, show a quiet
line ("Showing your most recent records."), never a red banner. The copy never
calls the error temporary or promises that the records are safe.

## Size caps

A field is text. Store a file as its `https://files.taskade.com/...` URL,
never as a base64 `data:` URL.

| Limit                                             | Error                            |
| ------------------------------------------------- | -------------------------------- |
| One `createNode` / `updateNode` body over 256 KiB | 413 `node_write_too_large`       |
| A growing write to a project over 64 MiB          | 413 `document_too_large`         |
| A read of a project over 64 MiB                   | 503 `project_contents_too_large` |

A project at the size cap shows no data to anyone.

## Field keys: display name vs field path

`fieldValues` carries each value under the field path (`/attributes/@statu`)
and, when the name is unique in the project, under the display name
(`Status`). `getFieldValue(row, '@statu')` reads the field path.

Writes accept either form. The match is exact (case and spaces), and the
gateway drops an unknown key with no error. Build each write from the exact
keys of your form state: `fields.Result` for a state key `result` reads
`undefined`, and the saved row loses that value.

## Automations: `@/lib/genesis-flows`

```ts
import { submitForm, runFlow, getFlowRuns, FlowRunFailedError } from '@/lib/genesis-flows';

await submitForm(FLOW_ID, { file, title: file.name }); // form-trigger flow
const { output } = await runFlow(FLOW_ID, { orderId: '789' }, { idempotencyKey: 'charge-789' });
const { runs, nextCursor } = await getFlowRuns(FLOW_ID, { limit: 5 }); // newest first
```

- `submitForm` returns `{ flowRunId?, ignoredKeys: string[] }`. A key in
  `ignoredKeys` matched no form input, so that answer was not saved: treat a
  non-empty list as a failed save.
- `runFlow` waits for the run (about 6 minutes at most) and returns
  `{ flowRunId?, output? }`. `output` is the body of the flow's "HTTP
  response" step, every value as text (`Number(output.total)`). With no such
  step, `output` is `undefined`.
- `getFlowRuns` returns `{ runs, nextCursor }`. A run has `id`, `status`
  (`completed | failed | running | filtered`), `createdAt` and `updatedAt`
  only. Step detail and error bodies are not readable from an app. Pass
  `nextCursor` back as `cursor`.
- A failed run throws `FlowRunFailedError`, whose `message` ("The automation
  failed: ...") is ready to show. Rethrow any other error.
- Run flows on a click, never on a timer. Recurring work is a Schedule flow
  that writes rows, and the app reads the rows.

Pass `idempotencyKey` on every button that sends, charges or writes. The same
key and values on the same UTC day run the flow once, so a double click or a
retry gets the first run and its answer. Build the key from the subject
(`send-invoice-${invoice.id}`), never from `crypto.randomUUID()` in the
handler. A "Try again" after `FlowRunFailedError` adds an attempt number
(`charge-${order.id}-2`). A run that failed before its first step (for
example over the run limit) does not hold the key. `submitForm` takes the same
option.

Change the key only after `FlowRunFailedError`, never in a catch for any error.
Any other error can mean the run is still going, and a new key would run the
flow a second time. A run with no answer yet gives a message that starts with
"The automation did not answer". Other errors keep their own text. Call again
with the same key to wait on the same run. Call your `refresh()` in
`finally`, so a run that saved its rows shows them even when the call threw. A
flow whose output must reach the page needs a key that stays the same.

### Intake forms: `createNode` only

A contact, lead or survey submit saves with `createNode`, not `submitForm`. A
disabled flow returns 403, and the submission is lost.

**One submission writes exactly one row.** Never call `createNode` and
`submitForm` for the same submit: if the flow has an Add Task step, every
submission lands twice. Put notifications in a separate flow that triggers on
the project write (`task.added`).

A row with a file: when the build instructions name `uploadFile`, upload each
file with it, then write the row once with `createNode`, with each returned
`url` in its field. Without those instructions, pass the `File` to
`submitForm` and let the flow's Add Task step save the row, and do not also
call `createNode`.

### A refused write

When a value does not fit its field (an object for a Select, text for a
Number), the gateway refuses the whole write with 400. `createNode` and
`updateNode` throw `GatewayInvalidFieldsError` (from `@/lib/genesis-gateway`).
Its `message` (`Please check: Result, Latency (ms)`) is ready to show. Keep
the answers on screen. `error.invalidFields` lists `key`, `title`, `expected`
and `received` for each field.

An uploaded file stays in the Media library when the row write after it
fails. So:

- Check every answer before the first `uploadFile` call: required answers,
  Select values from the option list, numbers as numbers.
- Keep each returned `url` with its `File` and reuse it on a retry.

```ts
const uploaded = useRef(new Map<File, string>());

async function save(answers: Record<string, string | number | boolean>, photo: File) {
  let url = uploaded.current.get(photo);
  if (url == null) {
    url = (await uploadFile(photo)).url;
    uploaded.current.set(photo, url);
  }
  await createNode(FAMILIES_ID, { ...answers, 'Child photo': url });
}
```

### A file for a flow

Pass the raw `File` as a value to `submitForm` or `runFlow`, under the key of
the flow's file input. The flow receives a `https://files.taskade.com/...` URL
that a `Convert File to Text` step can read. Never send a `data:` URL
(`FileReader.readAsDataURL`): the media steps refuse it as "Invalid URL".

## Per-user data

Inside `<GenesisAuth>`, gateway calls carry the signed-in user, so set no
Authorization header. A client filter (`filterByOwner`) changes only what
renders: every row still reaches the browser. Real privacy is row scoping: the
owner turns on Private per-user data in the Publish menu, or asks Taskade EVE.
Then `getNodes` returns only the user's rows.

## Keyed third-party APIs: `GenesisClient.proxy()`

```ts
import { GenesisClient } from '@taskade/genesis-client';

const taskade = new GenesisClient({ spaceId: SPACE_ID });
const res = await taskade.proxy({
  secretAlias: 'openai', // the key name in Space Settings -> Secrets
  url: 'https://api.openai.com/v1/chat/completions',
  method: 'POST',
  headers: { Authorization: 'Bearer {{secret}}' }, // the server fills {{secret}}
  body: { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hi' }] },
});
if (res.ok) {
  const data = await res.json();
}
```

The proxy returns the upstream `Response` for every status. Use it for any
API that needs a key, not for public data or Taskade calls. Tell the user to
add the secret under Space Settings -> Secrets with the exact `secretAlias`
name, and to set a spending limit with the provider.
