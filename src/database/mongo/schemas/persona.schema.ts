import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PersonaDocument = Persona & Document;

@Schema({ collection: 'gen_m_persona', timestamps: false })
export class Persona {
  @Prop({ type: Number, required: true, unique: true })
  id: number;

  @Prop({ type: Number })
  idTipoId: number;

  @Prop({ type: String })
  numeroId: string;

  @Prop({ type: String })
  apellido1: string;

  @Prop({ type: String })
  apellido2?: string;

  @Prop({ type: String })
  nombre1: string;

  @Prop({ type: String })
  nombre2?: string;

  @Prop({ type: String })
  fechaNac?: string;

  @Prop({ type: Number })
  idSexoBiologico?: number;

  @Prop({ type: String })
  direccion?: string;

  @Prop({ type: String })
  telMovil?: string;

  @Prop({ type: String })
  email?: string;
}

export const PersonaSchema = SchemaFactory.createForClass(Persona);