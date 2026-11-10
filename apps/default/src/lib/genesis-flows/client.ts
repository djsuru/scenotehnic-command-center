/**
 * Genesis Flows SDK - trigger Taskade automations from a Genesis app, natively.
 *
 * Two entry points, both thin wrappers over gateway routes:
 * - `submitForm` -> a flow whose trigger is a FORM (a side effect the app cannot do itself,
 *                   e.g. handing an uploaded document to an OCR step)
 * - `runFlow`    -> a flow whose trigger is a WEBHOOK or MANUAL (fire an automation now)
 *
 * NEITHER is how an intake form saves its row. A contact / lead / survey submit persists with
 * `createNode` from `@/lib/genesis-data`, and NEVER also calls `submitForm` for the same submit -
 * if the flow behind that form has an Add Task step, every submission lands twice.
 * The one exception is a file upload: pass the `File` here and let the flow's Add Task step
 * save the row with the media URL, with no `createNode` for that submit.
 *
 * Both return the created flow run id when available. `runFlow` waits for the whole
 * run and also returns `output`: the body of the flow's "HTTP response" step, or
 * undefined when the flow has no such step. A failed run throws `FlowRunFailedError`.
 *
 * Both accept an optional `idempotencyKey`. A second call with the same key and the
 * same values on the same day returns the first run instead of starting another one,
 * so a double click sends one email or one charge.
 *
 * Do not change that key after an error, unless the error is a `FlowRunFailedError`.
 * Any other error can mean the run is still going, so a new key can run it twice.
 */
import { gatewayRequest, isEmptyString } from '../genesis-gateway';
import type { ClientOptions, GatewayResponse } from '../genesis-gateway';
import { FlowRunFailedError } from './errors';

/**
 * Options for `runFlow` and `submitForm`.
 */
export interface FlowRunOptions extends ClientOptions {
  /**
   * Makes a repeat of the same call safe. Build the key from what the action is
   * about, for example `send-invoice-${invoice.id}`, so that a double click and a
   * retry send the same key. Do not call `crypto.randomUUID()` inside the click
   * handler: each click then gets its own key, and nothing is deduped.
   * A call with the same key and the same values on the same day (UTC) returns the
   * first run and its answer, also when that run failed, so a retry never charges
   * twice. To run it again on purpose after a `FlowRunFailedError`, add an attempt
   * number to the key (`charge-${order.id}-2`). A run that failed before any step
   * started (for example over the run limit) does not hold the key. Different values
   * start a new run. Up to 128 characters.
   */
  idempotencyKey?: string;
}

/**
 * The body of the flow's "HTTP response" step, keyed by the names set in that step.
 * Every value is text: convert a number with `Number(output.total)`.
 */
export type FlowOutput = Record<string, string>;

const IDEMPOTENCY_KEY_MAX_LENGTH = 128;

/**
 * The gateway sends `output` and a plain failure only to a caller that sends this
 * header. A caller without it gets the older answers.
 */
const FLOW_OUTPUT_CAPABLE_HEADER = 'X-Taskade-Flow-Output-Capable';

/**
 * How long `runFlow` waits. The gateway waits up to 90 s for the run, so the 30 s
 * default of `gatewayRequest` cut off a slow flow while it still ran.
 */
const RUN_FLOW_TIMEOUT_MS = 100_000;

/**
 * How many times `runFlow` asks for one run. Each ask waits about 90 s, so the call
 * waits about 6 minutes in all.
 */
const RUN_FLOW_MAX_POSTS = 4;

/**
 * Sent on every ask after the first. The gateway then only reads the run of this key
 * and these values. It never starts one, and answers 409 when it finds none.
 */
const FLOW_ATTACH_HEADER = 'X-Taskade-Flow-Attach';

const FLOW_RUN_FAILED_PREFIX = 'Taskade gateway request failed: 422 ';
const FLOW_DISABLED_PREFIX = 'Taskade gateway request failed: 403 ';
const FLOW_RUN_UNAVAILABLE_PREFIX = 'Taskade gateway request failed: 503 ';

/**
 * The messages for a run with no answer yet all start with "The automation did not
 * answer", so a page can tell them from a failure by that start.
 */
const STILL_RUNNING_RETRY_MESSAGE =
  'The automation did not answer yet and is still running. Try this same action again in a few minutes to get its result. That will not start a second run.';
const STILL_RUNNING_NO_RETRY_MESSAGE =
  'The automation did not answer yet and is still running. If it saves its result, that will show here later. Starting it again would run it a second time.';
const START_UNCONFIRMED_MESSAGE =
  'The automation did not answer, and we could not confirm that it started. It may still run, so check before starting it again.';
const LOST_CONTACT_MESSAGE =
  'The automation did not answer because we lost contact with it. It may still be running, so check before starting it again.';

/** The answers to a repeat ask that say nothing about how the run ended. */
const LOST_CONTACT_STATUSES = [409, 429, 502, 503, 504];

function idempotencyHeaders(options: FlowRunOptions | undefined): Record<string, string> {
  const key = options?.idempotencyKey;
  if (key == null) {
    return {};
  }
  const trimmed = key.trim();
  if (trimmed.length === 0 || trimmed.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    throw new Error(`idempotencyKey must hold 1 to ${IDEMPOTENCY_KEY_MAX_LENGTH} characters`);
  }
  return { 'Idempotency-Key': trimmed };
}

/**
 * The `extensions` in the JSON body of a gateway error that starts with `prefix`.
 */
function readGatewayExtensions(err: unknown, prefix: string): Record<string, unknown> | undefined {
  if (!(err instanceof Error) || !err.message.startsWith(prefix)) {
    return undefined;
  }
  try {
    const body: unknown = JSON.parse(err.message.slice(prefix.length));
    return (body as { extensions?: Record<string, unknown> } | null)?.extensions;
  } catch {
    return undefined;
  }
}

/**
 * The `FlowRunFailedError` in a 422 gateway error, or null for any other error.
 */
function readFlowRunFailure(err: unknown): FlowRunFailedError | null {
  const extensions = readGatewayExtensions(err, FLOW_RUN_FAILED_PREFIX);
  if (extensions?.reason !== 'FLOW_RUN_FAILED') {
    return null;
  }
  const { flowRunError, flowRunId } = extensions;
  return new FlowRunFailedError(
    typeof flowRunError === 'string' && flowRunError !== ''
      ? flowRunError
      : 'An unknown error occurred',
    typeof flowRunId === 'string' ? flowRunId : undefined,
    { cause: err },
  );
}

/**
 * A readable error for the 403 the gateway sends when the flow is turned off, or
 * null for any other error (a 403 for a permission problem stays as it was).
 */
function readFlowDisabled(err: unknown): Error | null {
  const extensions = readGatewayExtensions(err, FLOW_DISABLED_PREFIX);
  if (extensions?.reason !== 'FLOW_DISABLED') {
    return null;
  }
  return new Error('This automation is turned off in Taskade. Turn it on, then try again.', {
    cause: err,
  });
}

/**
 * True for an error on a repeat ask that leaves the run unknown: no answer at all
 * (a network error or our timeout), or an answer that says nothing about the run.
 */
function isLostContact(err: unknown): boolean {
  if (err instanceof TypeError) {
    return true;
  }
  if (!(err instanceof Error)) {
    return false;
  }
  return (
    err.message.startsWith('Taskade gateway request timed out') ||
    LOST_CONTACT_STATUSES.some((status) =>
      err.message.startsWith(`Taskade gateway request failed: ${status} `),
    ) ||
    readFlowDisabled(err) != null
  );
}

/**
 * The key of a `runFlow` call that names none, so that the call can ask again for its
 * own run. A new call gets a new key and starts its own run. A page outside a secure
 * context has no `randomUUID`: the call then sends no key and asks only once.
 */
function newRunKey(): string | null {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : null;
}

function isFileLike(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

/**
 * JSON text with object keys sorted at every level (array order stays). The gateway
 * hashes a multipart field as sent, so a nested value in another key order would
 * otherwise defeat an `idempotencyKey`.
 */
function sortedJson(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) =>
    inner != null && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(
          Object.entries(inner as Record<string, unknown>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : inner,
  );
}

/**
 * Builds the request body for a flow trigger.
 *
 * If any value is a `File`/`Blob` (a user-uploaded document or photo), sends
 * `multipart/form-data` so the gateway uploads each file to Taskade media and
 * hands the flow a real `https://files.taskade.com/...` URL. That URL is what the
 * Media pieces need - `pdf.convertToText` / `convertMediaToProject` derive a media
 * key from it. NEVER inline a base64 `data:` URL into a JSON field: those actions
 * reject it as "Invalid URL", so the file is never read. With no files, sends JSON
 * exactly as before.
 */
function buildFlowBody(values: Record<string, unknown>): BodyInit {
  if (!Object.values(values).some(isFileLike)) {
    return JSON.stringify(values);
  }
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value == null) {
      continue;
    }
    if (isFileLike(value)) {
      // Field name = the flow input key the Media step reads (e.g. the trigger's
      // file field). File parts are replaced server-side with a media URL.
      const filename = typeof File !== 'undefined' && value instanceof File ? value.name : key;
      formData.append(key, value, filename);
    } else if (typeof value === 'object') {
      formData.append(key, sortedJson(value));
    } else {
      formData.append(key, String(value));
    }
  }
  return formData;
}

/**
 * Submits values to a FORM-trigger flow, for a side effect the app cannot perform
 * itself. Values are keyed by the form's input names.
 *
 * NOT for saving an intake row: a contact / lead / survey submit calls `createNode`
 * instead, and calling both for one submit writes the row twice.
 * The one exception is a row that carries an uploaded file: the flow's Add Task step saves
 * it with the media URL, and the page does not also call `createNode`.
 *
 * To send an uploaded document or photo, pass the `File` object directly (do NOT
 * read it into a base64 `data:` URL) - it is uploaded to media and the flow input
 * receives a real `https://files.taskade.com/...` URL for a `pdf.convertToText` step.
 *
 * `ignoredKeys` lists the value keys the gateway reported as matching no form input.
 * It is empty when the gateway reports none.
 *
 * Pass `idempotencyKey` (see `FlowRunOptions`) so that a double submit runs the flow once.
 *
 * @example
 * ```typescript
 * // With a file (e.g. from an <input type="file">):
 * await submitForm('flow-123', { document: fileInput.files[0], title: 'Contract' });
 * ```
 */
export async function submitForm(
  flowId: string,
  values: Record<string, unknown>,
  options?: FlowRunOptions,
): Promise<{ flowRunId?: string; ignoredKeys: string[] }> {
  if (isEmptyString(flowId)) {
    throw new Error('Flow ID cannot be empty');
  }
  let data: GatewayResponse<{ flowRunId: string; ignoredKeys?: string[] }>;
  try {
    data = await gatewayRequest<GatewayResponse<{ flowRunId: string; ignoredKeys?: string[] }>>(
      `/forms/${encodeURIComponent(flowId)}/run`,
      { method: 'POST', body: buildFlowBody(values), headers: idempotencyHeaders(options) },
      options,
    );
  } catch (err) {
    const disabled = readFlowDisabled(err);
    if (disabled != null) {
      throw disabled;
    }
    throw err;
  }
  return { flowRunId: data.payload?.flowRunId, ignoredKeys: data.payload?.ignoredKeys ?? [] };
}

/**
 * Triggers a WEBHOOK- or MANUAL-trigger flow with an optional input payload, waits
 * for the run, and returns `{ flowRunId, output }`. `output` is the body of the flow's
 * "HTTP response" step (every value is text), or undefined when the flow has no such
 * step. A run over about 90 s continues, and the call keeps asking for it, for about
 * 6 minutes in all. It then throws an error whose message starts with "The automation
 * did not answer", and the run still continues.
 *
 * A failed run throws `FlowRunFailedError` with a message a person can read.
 * A paused automation throws an error whose message says it is turned off.
 *
 * Pass `idempotencyKey` for a button that sends an email, charges a card, or writes
 * a row: a double click then runs the flow once, and both calls get the same answer.
 * When the call throws without a `FlowRunFailedError`, call again with the same key: it
 * waits on the same run and does not start a second one. Change the key only after a
 * `FlowRunFailedError`. Without a key, a call that throws cannot get its result back,
 * so a flow whose output must reach the page needs a key.
 *
 * Like `submitForm`, pass a `File` value to upload a document/photo - it becomes a
 * real media URL for the flow (never inline a base64 `data:` URL).
 *
 * @example
 * ```typescript
 * const { output } = await runFlow(
 *   quoteFlowId,
 *   { orderId: order.id },
 *   { idempotencyKey: `quote-${order.id}` },
 * );
 * setTotal(Number(output?.total ?? 0));
 * ```
 */
export async function runFlow(
  flowId: string,
  input?: Record<string, unknown>,
  options?: FlowRunOptions,
): Promise<{ flowRunId?: string; output?: FlowOutput }> {
  if (isEmptyString(flowId)) {
    throw new Error('Flow ID cannot be empty');
  }
  const pageKeyHeaders = idempotencyHeaders(options);
  const hasPageKey = options?.idempotencyKey != null;
  const ownKey = hasPageKey ? null : newRunKey();
  const keyHeaders = ownKey == null ? pageKeyHeaders : { 'Idempotency-Key': ownKey };
  const body = buildFlowBody(input ?? {});
  let data: unknown;
  for (let post = 1; ; post++) {
    try {
      data = await gatewayRequest<unknown>(
        `/webhooks/${encodeURIComponent(flowId)}/run`,
        {
          method: 'POST',
          body,
          headers: {
            [FLOW_OUTPUT_CAPABLE_HEADER]: '1',
            ...keyHeaders,
            ...(post > 1 ? { [FLOW_ATTACH_HEADER]: '1' } : {}),
          },
          signal: AbortSignal.timeout(RUN_FLOW_TIMEOUT_MS),
        },
        options,
      );
      break;
    } catch (err) {
      const failure = readFlowRunFailure(err);
      if (failure != null) {
        throw failure;
      }
      const unavailableReason = readGatewayExtensions(err, FLOW_RUN_UNAVAILABLE_PREFIX)?.reason;
      if (unavailableReason === 'FLOW_RUN_STILL_RUNNING') {
        if ((hasPageKey || ownKey != null) && post < RUN_FLOW_MAX_POSTS) {
          continue;
        }
        throw new Error(hasPageKey ? STILL_RUNNING_RETRY_MESSAGE : STILL_RUNNING_NO_RETRY_MESSAGE, {
          cause: err,
        });
      }
      if (post > 1 && isLostContact(err)) {
        throw new Error(LOST_CONTACT_MESSAGE, { cause: err });
      }
      if (unavailableReason === 'FLOW_RUN_START_UNCONFIRMED') {
        throw new Error(START_UNCONFIRMED_MESSAGE, { cause: err });
      }
      const disabled = readFlowDisabled(err);
      if (disabled != null) {
        throw disabled;
      }
      if (err instanceof Error && err.message.startsWith('Taskade gateway request timed out')) {
        throw new Error(
          `The automation did not answer within ${RUN_FLOW_TIMEOUT_MS / 1000} s. It can still be running.`,
          { cause: err },
        );
      }
      throw err;
    }
  }
  // The gateway envelope has a boolean `ok`. An older gateway sends the raw body of
  // the "HTTP response" step instead, whose values are all text.
  const envelope = data as GatewayResponse<{ flowRunId?: string; output?: FlowOutput }> | null;
  if (envelope == null || typeof envelope.ok !== 'boolean') {
    return { flowRunId: undefined, output: (data ?? undefined) as FlowOutput | undefined };
  }
  return { flowRunId: envelope.payload?.flowRunId, output: envelope.payload?.output };
}

export type FlowRunStatus = 'completed' | 'failed' | 'running' | 'filtered';

export interface FlowRunSummary {
  id: string;
  status: FlowRunStatus;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}

export interface FlowRunsPage {
  runs: FlowRunSummary[];
  /** Opaque; pass as `cursor` to fetch the next (older) page. Null when there is none. */
  nextCursor: string | null;
}

/**
 * Reads a flow's recent runs, newest first. Use this helper rather than fetching
 * the gateway path by hand: it is the supported contract (encoding, paging,
 * response envelope) and the raw URL is not. Each run carries id, status and
 * timestamps only, so an automation-status widget can say "last run completed
 * 2 minutes ago"; step detail and error bodies are not readable from an app.
 *
 * @example
 * ```typescript
 * const { runs } = await getFlowRuns(syncFlowId, { limit: 1 });
 * const last = runs[0]; // undefined when the flow has never run
 * ```
 */
export async function getFlowRuns(
  flowId: string,
  page?: { limit?: number; cursor?: string },
  options?: ClientOptions,
): Promise<FlowRunsPage> {
  if (isEmptyString(flowId)) {
    throw new Error('Flow ID cannot be empty');
  }
  const params = new URLSearchParams();
  if (page?.limit != null) {
    params.set('limit', String(page.limit));
  }
  if (page?.cursor != null && page.cursor !== '') {
    params.set('cursor', page.cursor);
  }
  const query = params.toString();
  const search = query !== '' ? `?${query}` : '';
  const data = await gatewayRequest<GatewayResponse<FlowRunsPage>>(
    `/flows/${encodeURIComponent(flowId)}/runs${search}`,
    { method: 'GET' },
    options,
  );
  return { runs: data.payload?.runs ?? [], nextCursor: data.payload?.nextCursor ?? null };
}
