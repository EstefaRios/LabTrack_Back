import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResultadosController } from './resultados.controller';
import { ResultadosService } from './resultados.service';
import {
  Orden,
  OrdenSchema,
  Persona,
  PersonaSchema,
  OrdenResultado,
  OrdenResultadoSchema,
  Grupo,
  GrupoSchema,
  Procedimiento,
  ProcedimientoSchema,
  Prueba,
  PruebaSchema,
  Tarjetero,
  TarjeteroSchema,
} from '../database/mongo/schemas';
import { ResultadosMongoService } from './resultados.mongo.service';

@Module({
  imports: [
    // Modelos Mongoose para consultas en Mongo
    MongooseModule.forFeature([
      { name: Orden.name, schema: OrdenSchema },
      { name: Persona.name, schema: PersonaSchema },
      { name: OrdenResultado.name, schema: OrdenResultadoSchema },
      { name: Grupo.name, schema: GrupoSchema },
      { name: Procedimiento.name, schema: ProcedimientoSchema },
      { name: Prueba.name, schema: PruebaSchema },
      { name: Tarjetero.name, schema: TarjeteroSchema },
    ]),
  ],
  controllers: [ResultadosController],
  providers: [ResultadosService, ResultadosMongoService],
  exports: [ResultadosService, ResultadosMongoService],
})
export class ResultadosModule {}
