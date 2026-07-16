import { EntityManager } from 'typeorm';

export interface IUnitOfWork {
  transaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T>;
  getManager(): EntityManager;
}
