/** Tamaño máximo del archivo de imagen (5 MB). */
export const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

const ALLOWED_TYPES = new Set(AVATAR_ACCEPT.split(','));

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function validateAvatarFile(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG, WebP o GIF.');
  }

  if (file.size > AVATAR_MAX_SIZE_BYTES) {
    throw new Error(
      `La imagen no puede superar 5 MB. Tamaño actual: ${formatFileSize(file.size)}.`,
    );
  }
}

/** Convierte un archivo de imagen a data URL base64 para guardar en la BD. */
export function fileToBase64DataUrl(file: File): Promise<string> {
  validateAvatarFile(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !result.startsWith('data:image/')) {
        reject(new Error('No se pudo procesar la imagen seleccionada.'));
        return;
      }
      resolve(result);
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.readAsDataURL(file);
  });
}
