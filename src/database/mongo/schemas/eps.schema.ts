import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EpsDocument = Eps & Document;

@Schema({ collection: 'gen_p_eps', timestamps: false })
export class Eps {
  @Prop({ type: Number, required: true, unique: true })
  id: number;
  @Prop({ type: String })
  codigo: string;
  @Prop({ type: String })
  razonsocial: string;
}

export const EpsSchema = SchemaFactory.createForClass(Eps);