import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { OLAP_ENTITIES } from './entities/olap';

loadEnv({ path: '.env' });

export const OlapDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_OLAP_HOST ?? process.env.DB_HOST,
  port: parseInt(process.env.DB_OLAP_PORT ?? process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_OLAP_DATABASE,
  username: process.env.DB_OLAP_USERNAME ?? process.env.DB_USERNAME,
  password: process.env.DB_OLAP_PASSWORD ?? process.env.DB_PASSWORD,
  entities: OLAP_ENTITIES,
  migrations: ['src/infrastructure/typeorm/migrations/olap/*.{ts,js}'],
  synchronize: false,
  logging: false,
});

export default OlapDataSource;
