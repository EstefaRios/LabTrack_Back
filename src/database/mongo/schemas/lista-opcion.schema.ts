import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ListaOpcionDocument = ListaOpcion & Document;

@Schema({ collection: 'gen_p_listaopcion', timestamps: false })
export class ListaOpcion {
  @Prop({ type: Number, required: true, unique: true })
  id: number;
  @Prop({ type: String })
  variable: string;
  @Prop({ type: String })
  descripcion: string;
  @Prop({ type: Number })
  valor: number;
  @Prop({ type: String })
  nombre: string;
  @Prop({ type: String })
  abreviacion: string;
  @Prop({ type: Boolean })
  habilita: boolean;
}

export const ListaOpcionSchema = SchemaFactory.createForClass(ListaOpcion);