import {
  AVATAR_MAX_BYTES,
  getBase64DecodedSize,
  isValidAvatarValue,
} from './avatar-base64.util';

describe('avatar-base64.util', () => {
  const tinyPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  it('acepta data URL png válida', () => {
    expect(isValidAvatarValue(tinyPng)).toBe(true);
  });

  it('acepta URL legacy http(s)', () => {
    expect(isValidAvatarValue('https://cdn.example.com/avatar.jpg')).toBe(true);
  });

  it('rechaza base64 sin prefijo data URL', () => {
    expect(isValidAvatarValue('aGVsbG8=')).toBe(false);
  });

  it('rechaza mime no permitido', () => {
    expect(isValidAvatarValue('data:application/pdf;base64,aGVsbG8=')).toBe(
      false,
    );
  });

  it('rechaza imágenes mayores a 5 MB', () => {
    const oversized = 'A'.repeat(Math.ceil((AVATAR_MAX_BYTES * 4) / 3) + 4);
    expect(
      isValidAvatarValue(`data:image/png;base64,${oversized}`),
    ).toBe(false);
  });

  it('calcula tamaño decodificado de base64', () => {
    expect(getBase64DecodedSize('aGVsbG8=')).toBe(5);
  });
});
