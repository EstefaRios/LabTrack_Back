import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrdenDocument = Orden & Document;

@Schema({ collection: 'lab_m_orden', timestamps: false })
export class Orden {
  @Prop({ type: Number, required: true, unique: true })
  id: number;

  @Prop({ type: String, required: true })
  orden: string;

  @Prop({ type: Date, required: true })
  fecha: Date;

  @Prop({ type: Number })
  idHistoria?: number;

  @Prop({ type: Number })
  idProfesional?: number;

  @Prop({ type: Boolean, default: false })
  profesionalExterno: boolean;
}

export const OrdenSchema = SchemaFactory.createForClass(Orden);