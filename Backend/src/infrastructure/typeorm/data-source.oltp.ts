import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { OLTP_ENTITIES } from './entities/oltp';
import { OLTP_MIGRATIONS } from './migrations/oltp';

loadEnv({ path: '.env' });

export const OltpDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  entities: OLTP_ENTITIES,
  migrations: OLTP_MIGRATIONS,
  synchronize: false,
  logging: false,
});

export default OltpDataSource;
