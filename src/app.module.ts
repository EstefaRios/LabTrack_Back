import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
// import { ThrottlerModule } from '@nestjs/throttler'; // Desactivado para remover rate limiting
import { APP_INTERCEPTOR } from '@nestjs/core';
import { buildMongoConfig } from './database/mongo.config';

import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { PacienteModule } from './paciente/paciente.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { AuditModule } from './auditoria/auditoria.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { ResultadosModule } from './resultados/resultados.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { RateLimitGuard } from './common/guards/rate-limit.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Conexión a MongoDB (opcional, activada si existe MONGO_URI)
    ...(process.env.MONGO_URI || process.env.MONGODB_URI
      ? [MongooseModule.forRootAsync({ useFactory: buildMongoConfig })]
      : []),
    // ThrottlerModule.forRoot([{
    //   ttl: +process.env.THROTTLE_TTL! || 60,
    //   limit: +process.env.THROTTLE_LIMIT! || 100,
    // }]), // Desactivado para remover rate limiting
    AuthModule,
    PacienteModule,
    OrdenesModule,
    AuditModule,
    NotificacionesModule,
    ResultadosModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    RateLimitGuard,
  ],
})
export class AppModule {}
