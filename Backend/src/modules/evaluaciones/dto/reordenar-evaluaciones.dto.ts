import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReordenarItemDto {
  @IsInt()
  id!: number;

  @IsInt()
  @Min(1)
  orden!: number;
}

export class ReordenarEvaluacionesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReordenarItemDto)
  evaluaciones!: ReordenarItemDto[];
}
