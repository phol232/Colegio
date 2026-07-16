import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  EVALUATION_REPOSITORY,
  IEvaluationRepository,
} from '../ports/evaluation.repository.port';

export const MAX_EVALUATION_WEIGHT_TOTAL = 100;

@Injectable()
export class EvaluationWeightPolicyService {
  constructor(
    @Inject(EVALUATION_REPOSITORY)
    private readonly evaluationRepository: IEvaluationRepository,
  ) {}

  validateTotalWeight(total: number): void {
    if (total > MAX_EVALUATION_WEIGHT_TOTAL) {
      throw new BadRequestException(
        `La suma de pesos no puede superar ${MAX_EVALUATION_WEIGHT_TOTAL} (actual: ${total})`,
      );
    }
  }

  async validateForCourseUnit(
    cursoId: number,
    unidad: number,
    additionalWeight = 0,
    excludeEvaluationId?: number,
  ): Promise<void> {
    const currentTotal =
      await this.evaluationRepository.sumWeightsByCourseUnit(
        cursoId,
        unidad,
        excludeEvaluationId,
      );
    this.validateTotalWeight(currentTotal + additionalWeight);
  }
}
