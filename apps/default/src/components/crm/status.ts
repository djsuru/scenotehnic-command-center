export const STATUS_OPTIONS = ['Nou', 'Contactat', 'Se califică', 'Ofertat', 'Câștigat', 'Pierdut'];

export function statusLabel(value: string) {
  const key = value.trim().toLocaleLowerCase('ro-RO').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const labels: Record<string, string> = {
    nou: 'Nou',
    contactat: 'Contactat',
    'se califica': 'Se califică',
    se_califica: 'Se califică',
    ofertat: 'Ofertat',
    castigat: 'Câștigat',
    pierdut: 'Pierdut',
  };
  return labels[key] ?? value;
}
