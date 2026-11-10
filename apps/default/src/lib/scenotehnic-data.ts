import { gatewayRequest } from '@/lib/genesis-gateway';

export interface GenesisNode {
  id: string;
  parentId: string | null;
  content?: string;
  fieldValues: Record<string, string | number | null | undefined>;
}

type NodesEnvelope = { ok: boolean; payload?: { nodes?: GenesisNode[] } };
type WriteEnvelope = { ok: boolean; payload?: { node?: { id: string }; ignoredKeys?: string[] } };

export async function getNodes(projectId: string): Promise<GenesisNode[]> {
  const result = await gatewayRequest<NodesEnvelope>(`/projects/${encodeURIComponent(projectId)}/nodes`, { method: 'GET' });
  return result.payload?.nodes ?? [];
}

export async function createNode(projectId: string, values: Record<string, string | number | boolean | null>): Promise<{ id: string; ignoredKeys: string[] }> {
  const result = await gatewayRequest<WriteEnvelope>(`/projects/${encodeURIComponent(projectId)}/nodes`, { method: 'POST', body: JSON.stringify(values) });
  const id = result.payload?.node?.id;
  if (id == null) throw new Error('Rândul nu a putut fi salvat.');
  const ignoredKeys = result.payload?.ignoredKeys ?? [];
  if (ignoredKeys.length > 0) throw new Error(`Unele câmpuri nu au fost salvate: ${ignoredKeys.join(', ')}`);
  return { id, ignoredKeys };
}

export function getFieldValue(node: GenesisNode, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = node.fieldValues[key];
    if (value != null && String(value).trim() !== '') return String(value);
  }
  return null;
}

export function getFieldNumber(node: GenesisNode, ...keys: string[]): number | null {
  const value = getFieldValue(node, ...keys);
  if (value == null) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function getTitle(node: GenesisNode, ...keys: string[]): string | null {
  return getFieldValue(node, ...keys) ?? node.content ?? null;
}
