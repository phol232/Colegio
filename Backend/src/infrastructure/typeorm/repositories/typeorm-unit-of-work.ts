import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { IUnitOfWork } from '@/domain/ports/unit-of-work.port';

export const OLTP_CONNECTION = 'oltp';

@Injectable()
export class TypeOrmUnitOfWork implements IUnitOfWork {
  constructor(
    @InjectDataSource(OLTP_CONNECTION)
    private readonly dataSource: DataSource,
  ) {}

  getManager(): EntityManager {
    return this.dataSource.manager;
  }

  transaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(fn);
  }
}
