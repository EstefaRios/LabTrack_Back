import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificacionDocument = Notificacion & Document;

@Schema({ collection: 'notification', timestamps: false })
export class Notificacion {
  @Prop({ type: Number, required: true, unique: true })
  id: number;

  @Prop({ type: Number, index: true })
  idUsuario: number;

  @Prop({ type: String, default: 'info' })
  type: string;

  @Prop({ type: String })
  titulo: string;

  @Prop({ type: String })
  mensaje: string;

  @Prop({ type: Object })
  data?: Record<string, any>;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Boolean, index: true, default: false })
  leida: boolean;

  @Prop({ type: Date, index: true, default: () => new Date() })
  fechaCreacion: Date;

  @Prop({ type: Date })
  fechaLectura?: Date | null;
}

export const NotificacionSchema = SchemaFactory.createForClass(Notificacion);