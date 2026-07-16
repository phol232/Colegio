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
  UNIT_OF_WORK,
  USER_REPOSITORY,
} from '@/domain/ports/tokens';
import { AuthTokenService } from '@/domain/services/auth-token.service';
import { AttendanceCalculatorService } from '@/domain/services/attendance-calculator.service';
import { EvaluationWeightPolicyService } from '@/domain/services/evaluation-weight-policy.service';
import { GradeLiteralService } from '@/domain/services/grade-literal.service';
import { PromedioCalculatorService } from '@/domain/services/promedio-calculator.service';
import { OLAP_ENTITIES } from './entities/olap';
import { OLTP_ENTITIES } from './entities/oltp';
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
  TypeOrmUnitOfWork,
  TypeOrmUserRepository,
} from './repositories';

const repositoryProviders = [
  { provide: UNIT_OF_WORK, useClass: TypeOrmUnitOfWork },
  { provide: USER_REPOSITORY, useClass: TypeOrmUserRepository },
  { provide: AUTH_REPOSITORY, useClass: TypeOrmAuthRepository },
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
