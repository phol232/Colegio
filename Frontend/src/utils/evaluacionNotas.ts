export const MESES_NOTAS: Record<number, string> = {
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

export function nombreMesNotas(mes: number): string {
  return MESES_NOTAS[mes] ?? `Mes ${mes}`;
}

export function isTipoExamen(tipo: string): boolean {
  return tipo.trim().toLowerCase() === 'examen';
}

export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-sidebar-bg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sidebar-hover disabled:pointer-events-none disabled:opacity-50';

export const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]';
