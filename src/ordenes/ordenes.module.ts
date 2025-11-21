import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdenesController } from './ordenes.controller';
import { OrdenesService } from './ordenes.service';
// Eliminado soporte TypeORM; solo usamos Mongoose
import { ResultadosModule } from '../resultados/resultados.module';
import {
  Orden as OrdenMongo,
  OrdenSchema,
  Tarjetero as TarjeteroMongo,
  TarjeteroSchema,
  Persona as PersonaMongo,
  PersonaSchema,
} from '../database/mongo/schemas';

@Module({
  imports: [
    // Mongoose modelos para listar y resultados en Mongo
    MongooseModule.forFeature([
      { name: OrdenMongo.name, schema: OrdenSchema },
      { name: TarjeteroMongo.name, schema: TarjeteroSchema },
      { name: PersonaMongo.name, schema: PersonaSchema },
    ]),
    ResultadosModule,
  ],
  controllers: [OrdenesController],
  providers: [OrdenesService],
})
export class OrdenesModule {}
