import { getFieldValue, getTitle, type GenesisNode } from '@/lib/genesis-data';

export type AccessRecord = {
  node: GenesisNode;
  name: string;
  email: string;
  role: string;
  access: string;
  token: string;
};

function accessKey(value: string): string {
  return value.trim().toLocaleLowerCase('ro-RO').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function accessRole(value: string): string {
  const key = accessKey(value);
  if (key === 'administrator') return 'Administrator';
  if (key === 'vanzari') return 'Vânzări';
  return value;
}

function accessStatus(value: string): string {
  const key = accessKey(value);
  if (key === 'activ') return 'Activ';
  if (key === 'asteptare') return 'În așteptare';
  if (key === 'blocat') return 'Blocat';
  return value;
}

export function accessRecord(node: GenesisNode): AccessRecord {
  return {
    node,
    name: getTitle(node, 'Nume utilizator') ?? 'Utilizator CRM',
    email: getFieldValue(node, 'Email') ?? '',
    role: accessRole(getFieldValue(node, 'Rol') ?? 'Vânzări'),
    access: accessStatus(getFieldValue(node, 'Acces') ?? 'În așteptare'),
    token: getFieldValue(node, 'Link activare', '/attributes/@accesslink') ?? '',
  };
}
