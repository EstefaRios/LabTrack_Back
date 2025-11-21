import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notificacion,
  NotificacionDocument,
} from '../database/mongo/schemas/notificacion.schema';
import { ListarNotificacionesQuery } from './notificaciones.dto';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectModel(Notificacion.name)
    private notifModel: Model<NotificacionDocument>,
  ) {}

  async crear(dto: any) {
    // Generar ID incremental sencillo (basado en el mayor existente)
    const last = await this.notifModel
      .find({}, { id: 1 })
      .sort({ id: -1 })
      .limit(1)
      .lean();
    const nextId = (last[0]?.id ?? 0) + 1;

    const doc = new this.notifModel({
      id: nextId,
      idUsuario: dto.idUsuario,
      type: dto.tipo || 'info',
      titulo: dto.titulo,
      mensaje: dto.mensaje,
      data: dto.datos,
      metadata: dto.metadata ?? null,
      leida: false,
      fechaCreacion: new Date(),
      fechaLectura: null,
    });
    await doc.save();
    return doc.toObject();
  }

  async listar(query: ListarNotificacionesQuery) {
    const { idUsuario, soloNoLeidas, pagina = 1, tipo, desde, hasta } = query;
    const take = 10,
      skip = (pagina - 1) * take;
    const where: any = { idUsuario };

    if (soloNoLeidas) where.leida = false;
    if (tipo) where.type = tipo;

    // Filtros de fecha
    if (desde) where.fechaCreacion = { ...(where.fechaCreacion || {}), $gte: new Date(desde) };
    if (hasta)
      where.fechaCreacion = {
        ...(where.fechaCreacion || {}),
        $lte: new Date(hasta + 'T23:59:59.999Z'),
      };

    const [rows, total] = await Promise.all([
      this.notifModel
        .find(where)
        .sort({ fechaCreacion: -1 })
        .skip(skip)
        .limit(take)
        .lean(),
      this.notifModel.countDocuments(where),
    ]);

    // Mapeo de entidad inglés a respuesta español
    const data = rows.map((n) => ({
      id: n.id,
      idUsuario: n.idUsuario,
      tipo: n.type,
      titulo: n.titulo,
      mensaje: n.mensaje,
      datos: n.data,
      metadata: n.metadata,
      leida: n.leida,
      fechaCreacion: n.fechaCreacion,
      fechaLectura: n.fechaLectura,
    }));

    return {
      total,
      pagina,
      totalPaginas: Math.ceil(total / take),
      data,
    };
  }

  async conteoNoLeidas(idUsuario: number) {
    const count = await this.notifModel.countDocuments({
      idUsuario,
      leida: false,
    });
    return { conteo: count };
  }

  async marcarLeida(id: number, leida = true) {
    const notif = await this.notifModel.findOne({ id }).lean();
    if (!notif) throw new NotFoundException('Notificación no encontrada');
    await this.notifModel.updateOne(
      { id },
      { $set: { leida, fechaLectura: leida ? new Date() : null } },
    );
    return { ok: true } as any;
  }

  async eliminar(id: number) {
    const res = await this.notifModel.deleteOne({ id });
    if (res.deletedCount === 0)
      throw new NotFoundException('Notificación no encontrada');
    return { ok: true };
  }
}
