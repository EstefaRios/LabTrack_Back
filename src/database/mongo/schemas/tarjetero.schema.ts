import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TarjeteroDocument = Tarjetero & Document;

@Schema({ collection: 'fac_m_tarjetero', timestamps: false })
export class Tarjetero {
  @Prop({ type: Number, required: true, unique: true })
  id: number;

  @Prop({ type: String })
  historia: string;

  @Prop({ type: Number })
  idPersona: number;

  @Prop({ type: Number })
  idRegimen: number;

  @Prop({ type: Number })
  idEps?: number;

  @Prop({ type: Number })
  idNivel?: number;
}

export const TarjeteroSchema = SchemaFactory.createForClass(Tarjetero);