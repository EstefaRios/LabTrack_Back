import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProcedimientoDocument = Procedimiento & Document;

@Schema({ collection: 'lab_p_procedimientos', timestamps: false })
export class Procedimiento {
  @Prop({ type: Number, required: true, unique: true })
  id: number;

  @Prop({ type: Number })
  idCups: number;

  @Prop({ type: Number })
  idGrupo: number;

  @Prop({ type: String })
  metodo?: string;
}

export const ProcedimientoSchema = SchemaFactory.createForClass(Procedimiento);