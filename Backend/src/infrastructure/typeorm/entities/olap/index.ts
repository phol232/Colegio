import { DimEstudianteEntity } from './dim-estudiante.entity';
import { DimDocenteEntity } from './dim-docente.entity';
import { DimCursoEntity } from './dim-curso.entity';
import { DimTiempoEntity } from './dim-tiempo.entity';
import { DimGradoEntity } from './dim-grado.entity';
import { DimSeccionEntity } from './dim-seccion.entity';
import { FactRendimientoEstudiantilEntity } from './fact-rendimiento-estudiantil.entity';
import { ControlEtlEntity } from './control-etl.entity';

export { DimEstudianteEntity } from './dim-estudiante.entity';
export { DimDocenteEntity } from './dim-docente.entity';
export { DimCursoEntity } from './dim-curso.entity';
export { DimTiempoEntity } from './dim-tiempo.entity';
export { DimGradoEntity } from './dim-grado.entity';
export { DimSeccionEntity } from './dim-seccion.entity';
export { FactRendimientoEstudiantilEntity } from './fact-rendimiento-estudiantil.entity';
export { ControlEtlEntity } from './control-etl.entity';

export const olapEntities = [
  DimEstudianteEntity,
  DimDocenteEntity,
  DimCursoEntity,
  DimTiempoEntity,
  DimGradoEntity,
  DimSeccionEntity,
  FactRendimientoEstudiantilEntity,
  ControlEtlEntity,
];

export const OLAP_ENTITIES = olapEntities;
