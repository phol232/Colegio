import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { CommonModule } from './common/common.module';
import { AuthTokenGuard } from './common/guards/auth-token.guard';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { PerfilModule } from './modules/perfil/perfil.module';
import { MatriculaModule } from './modules/matricula/matricula.module';
import { HealthModule } from './modules/health/health.module';
import { DocenteModule } from './modules/docente/docente.module';
import { AsistenciasModule } from './modules/asistencias/asistencias.module';
import { EvaluacionesModule } from './modules/evaluaciones/evaluaciones.module';
import { NotasDetalleModule } from './modules/notas-detalle/notas-detalle.module';
import { NotasModule } from './modules/notas/notas.module';
import { PromediosModule } from './modules/promedios/promedios.module';
import { AdminModule } from './modules/admin/admin.module';
import { PadresModule } from './modules/padres/padres.module';
import { AnalisisModule } from './modules/analisis/analisis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: (config.get<number>('throttle.ttl') ?? 60) * 1000,
          limit: config.get<number>('throttle.apiLimit') ?? 500,
        },
      ],
    }),
    CommonModule,
    AuthModule,
    PerfilModule,
    MatriculaModule,
    HealthModule,
    DocenteModule,
    AsistenciasModule,
    EvaluacionesModule,
    NotasDetalleModule,
    NotasModule,
    PromediosModule,
    AdminModule,
    PadresModule,
    AnalisisModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthTokenGuard },
    { provide: APP_GUARD, useClass: MaintenanceGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
