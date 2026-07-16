import { Injectable } from '@nestjs/common';

export type GradeLiteral = 'AD' | 'A' | 'B' | 'C';

@Injectable()
export class GradeLiteralService {
  convertirALiteral(promedio: number | null | undefined): GradeLiteral {
    if (promedio == null || Number.isNaN(promedio)) {
      return 'C';
    }
    if (promedio >= 17) return 'AD';
    if (promedio >= 14) return 'A';
    if (promedio >= 11) return 'B';
    return 'C';
  }
}
