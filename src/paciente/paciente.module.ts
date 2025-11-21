import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PacienteController } from './paciente.controller';
import { PacienteService } from './paciente.service';
import { Persona, PersonaSchema, Tarjetero, TarjeteroSchema, ListaOpcion, ListaOpcionSchema, Eps, EpsSchema } from '../database/mongo/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Persona.name, schema: PersonaSchema },
      { name: Tarjetero.name, schema: TarjeteroSchema },
      { name: ListaOpcion.name, schema: ListaOpcionSchema },
      { name: Eps.name, schema: EpsSchema },
    ]),
  ],
  controllers: [PacienteController],
  providers: [PacienteService],
})
export class PacienteModule {}
