import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { Notificacion, NotificacionSchema } from '../database/mongo/schemas/notificacion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notificacion.name, schema: NotificacionSchema },
    ]),
  ],
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
