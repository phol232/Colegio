/** Tamaño máximo del archivo de imagen decodificado (5 MB). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const DATA_URL_PATTERN =
  /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/]+=*)\s*$/i;

const HTTP_URL_PATTERN = /^https?:\/\/.+/i;

/** Calcula el tamaño en bytes del payload base64 sin decodificar el buffer completo. */
export function getBase64DecodedSize(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function isLegacyAvatarUrl(value: string): boolean {
  return HTTP_URL_PATTERN.test(value.trim());
}

export function isValidAvatarValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;

  // Compatibilidad con avatares antiguos guardados como URL HTTP(S).
  if (isLegacyAvatarUrl(trimmed)) return true;

  const match = trimmed.match(DATA_URL_PATTERN);
  if (!match) return false;

  const mime = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_MIME.has(mime)) return false;

  const base64Data = match[2];
  if (getBase64DecodedSize(base64Data) > AVATAR_MAX_BYTES) return false;

  try {
    Buffer.from(base64Data, 'base64');
    return true;
  } catch {
    return false;
  }
}
