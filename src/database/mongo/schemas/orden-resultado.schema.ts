import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrdenResultadoDocument = OrdenResultado & Document;

@Schema({ collection: 'lab_m_orden_resultados', timestamps: false })
export class OrdenResultado {
  @Prop({ type: Number, required: true, unique: true })
  id: number;

  @Prop({ type: Date })
  fecha: Date;

  @Prop({ type: Number })
  idOrden: number;

  @Prop({ type: Number })
  idProcedimiento: number;

  @Prop({ type: Number })
  idPrueba: number;

  @Prop({ type: Number })
  idPruebaOpcion?: number;

  @Prop({ type: String })
  resOpcion?: string;

  @Prop({ type: String })
  resNumerico?: string;

  @Prop({ type: String })
  resTexto?: string;

  @Prop({ type: String })
  resMemo?: string;

  @Prop({ type: Number })
  numProcesamientos?: number;
}

export const OrdenResultadoSchema = SchemaFactory.createForClass(OrdenResultado);