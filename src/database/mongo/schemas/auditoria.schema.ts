import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditoriaDocument = Auditoria & Document;

@Schema({ collection: 'audit_log', timestamps: false })
export class Auditoria {
  @Prop({ type: Number, required: true, unique: true })
  id: number;

  @Prop({ type: Date, index: true, default: () => new Date() })
  createdAt: Date;

  @Prop({ type: Number, index: true })
  idUsuario?: number | null;

  @Prop({ type: String })
  tableName?: string | null;

  @Prop({ type: Number })
  recordId?: number | null;

  @Prop({ type: String })
  accion?: string | null;

  @Prop({ type: Object })
  oldData?: any;

  @Prop({ type: Object })
  newData?: any;

  @Prop({ type: String })
  ipAddress?: string | null;

  @Prop({ type: Date, default: () => new Date() })
  momento: Date;

  @Prop({ type: String })
  entidad?: string | null;

  @Prop({ type: Number })
  idEntidad?: number | null;

  @Prop({ type: Number })
  estadoHttp?: number | null;

  @Prop({ type: String })
  ip?: string | null;

  @Prop({ type: String })
  agenteUsuario?: string | null;

  @Prop({ type: Object })
  cuerpo?: any;

  @Prop({ type: Object })
  antes?: any;

  @Prop({ type: Object })
  despues?: any;
}

export const AuditoriaSchema = SchemaFactory.createForClass(Auditoria);