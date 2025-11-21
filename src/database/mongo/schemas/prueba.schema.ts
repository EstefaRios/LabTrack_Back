import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PruebaDocument = Prueba & Document;

@Schema({ collection: 'lab_p_pruebas', timestamps: false })
export class Prueba {
  @Prop({ type: Number, required: true, unique: true })
  id: number;

  @Prop({ type: String })
  codigoPrueba: string;

  @Prop({ type: String })
  nombrePrueba: string;

  @Prop({ type: String })
  unidad?: string;

  @Prop({ type: Number })
  idTipoResultado: number;
}

export const PruebaSchema = SchemaFactory.createForClass(Prueba);