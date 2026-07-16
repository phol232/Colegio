/**
 * IDs de PostgreSQL `bigint` llegan como string desde la API.
 * Normalizar con Number evita fallos de === entre string y number.
 */
export type ApiId = string | number;

export function toId(id: ApiId | null | undefined): number {
    return Number(id);
}

export function sameId(
    a: ApiId | null | undefined,
    b: ApiId | null | undefined,
): boolean {
    if (a == null || b == null) return false;
    return Number(a) === Number(b);
}
