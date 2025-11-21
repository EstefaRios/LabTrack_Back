import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GrupoDocument = Grupo & Document;

@Schema({ collection: 'lab_p_grupos', timestamps: false })
export class Grupo {
  @Prop({ type: Number, required: true, unique: true })
  id: number;

  @Prop({ type: String })
  codigo: string;

  @Prop({ type: String })
  nombre: string;
}

export const GrupoSchema = SchemaFactory.createForClass(Grupo);