export * from './oltp';
export * from './olap';

import { oltpEntities } from './oltp';
import { olapEntities } from './olap';

export const allEntities = [...oltpEntities, ...olapEntities];
