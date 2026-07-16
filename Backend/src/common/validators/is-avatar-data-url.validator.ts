import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValidAvatarValue } from '../utils/avatar-base64.util';

@ValidatorConstraint({ name: 'isAvatarDataUrl', async: false })
export class IsAvatarDataUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true;
    if (typeof value !== 'string') return false;
    return isValidAvatarValue(value);
  }

  defaultMessage(): string {
    return 'El avatar debe ser una imagen en base64 (data URL) de máximo 5 MB (JPEG, PNG, WebP o GIF).';
  }
}

export function IsAvatarDataUrl(validationOptions?: ValidationOptions) {
  return function registerAvatarValidator(object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsAvatarDataUrlConstraint,
    });
  };
}
