/** Mapeo mes académico → unidad (bimestre). */
export function mesToUnidad(mes: number): number {
  const exact: Record<number, number> = { 3: 1, 6: 2, 9: 3, 12: 4 };
  if (exact[mes] != null) return exact[mes];
  if (mes >= 3 && mes <= 5) return 1;
  if (mes >= 6 && mes <= 8) return 2;
  if (mes >= 9 && mes <= 11) return 3;
  return 4;
}
