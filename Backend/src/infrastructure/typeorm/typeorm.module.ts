import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ADMIN_REPOSITORY,
  ANALYTICS_REPOSITORY,
  ATTENDANCE_REPOSITORY,
  AUTH_REPOSITORY,
  ENROLLMENT_REPOSITORY,
  EVALUATION_REPOSITORY,
  GRADE_REPOSITORY,
  MATRICULA_REPOSITORY,
  UNIT_OF_WORK,
  USER_REPOSITORY,
} from '@/domain/ports/tokens';
import { AuthTokenService } from '@/domain/services/auth-token.service';
import { AttendanceCalculatorService } from '@/domain/services/attendance-calculator.service';
import { EvaluationWeightPolicyService } from '@/domain/services/evaluation-weight-policy.service';
import { GradeLiteralService } from '@/domain/services/grade-literal.service';
import { PromedioCalculatorService } from '@/domain/services/promedio-calculator.service';
import { MatriculaEligibilityService } from '@/domain/services/matricula-eligibility.service';
import { OLAP_ENTITIES } from './entities/olap';
import { OLTP_ENTITIES } from './entities/oltp';
import { OLTP_MIGRATIONS } from './migrations/oltp';
import {
  OLAP_CONNECTION,
  OLTP_CONNECTION,
  TypeOrmAdminRepository,
  TypeOrmAnalyticsRepository,
  TypeOrmAttendanceRepository,
  TypeOrmAuthRepository,
  TypeOrmEnrollmentRepository,
  TypeOrmEvaluationRepository,
  TypeOrmGradeRepository,
  TypeOrmMatriculaRepository,
  TypeOrmUnitOfWork,
  TypeOrmUserRepository,
} from './repositories';

/** Por defecto el API aplica migraciones al arrancar. Worker/scheduler: TYPEORM_MIGRATIONS_RUN=false */
function shouldRunOltpMigrations(): boolean {
  const flag = process.env.TYPEORM_MIGRATIONS_RUN?.trim().toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'off') return false;
  if (flag === 'true' || flag === '1' || flag === 'on') return true;
  // Sin flag: solo el proceso API (main), no worker/scheduler.
  return !process.env.WORKER_ROLE && !process.env.SCHEDULER_ROLE;
}

const repositoryProviders = [
  { provide: UNIT_OF_WORK, useClass: TypeOrmUnitOfWork },
  { provide: USER_REPOSITORY, useClass: TypeOrmUserRepository },
  { provide: AUTH_REPOSITORY, useClass: TypeOrmAuthRepository },
  { provide: MATRICULA_REPOSITORY, useClass: TypeOrmMatriculaRepository },
  { provide: ENROLLMENT_REPOSITORY, useClass: TypeOrmEnrollmentRepository },
  { provide: ATTENDANCE_REPOSITORY, useClass: TypeOrmAttendanceRepository },
  { provide: EVALUATION_REPOSITORY, useClass: TypeOrmEvaluationRepository },
  { provide: GRADE_REPOSITORY, useClass: TypeOrmGradeRepository },
  { provide: ADMIN_REPOSITORY, useClass: TypeOrmAdminRepository },
  { provide: ANALYTICS_REPOSITORY, useClass: TypeOrmAnalyticsRepository },
];

const domainServices = [
  GradeLiteralService,
  PromedioCalculatorService,
  AttendanceCalculatorService,
  AuthTokenService,
  EvaluationWeightPolicyService,
  MatriculaEligibilityService,
];

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      name: OLTP_CONNECTION,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('oltp.host'),
        port: config.get<number>('oltp.port'),
        database: config.get<string>('oltp.database'),
        username: config.get<string>('oltp.user'),
        password: config.get<string>('oltp.password'),
        entities: OLTP_ENTITIES,
        migrations: OLTP_MIGRATIONS,
        migrationsRun: shouldRunOltpMigrations(),
        migrationsTableName: 'typeorm_migrations',
        synchronize: false,
        logging: false,
      }),
    }),
    TypeOrmModule.forRootAsync({
      name: OLAP_CONNECTION,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('olap.host'),
        port: config.get<number>('olap.port'),
        database: config.get<string>('olap.database'),
        username: config.get<string>('olap.user'),
        password: config.get<string>('olap.password'),
        entities: OLAP_ENTITIES,
        synchronize: false,
        logging: false,
      }),
    }),
    TypeOrmModule.forFeature(OLTP_ENTITIES, OLTP_CONNECTION),
    TypeOrmModule.forFeature(OLAP_ENTITIES, OLAP_CONNECTION),
  ],
  providers: [...domainServices, ...repositoryProviders],
  exports: [
    TypeOrmModule,
    ...domainServices,
    ...repositoryProviders.map((p) => p.provide),
  ],
})
export class AppTypeOrmModule {}
