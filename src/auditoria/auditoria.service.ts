import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Auditoria, AuditoriaDocument } from '../database/mongo/schemas/auditoria.schema';
import { ListaAuditoriaQuery } from './auditoria.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(Auditoria.name)
    private auditModel: Model<AuditoriaDocument>,
  ) {}

  async log(entry: Partial<Auditoria>) {
    const last = await this.auditModel
      .find({}, { id: 1 })
      .sort({ id: -1 })
      .limit(1)
      .lean();
    const nextId = (last[0]?.id ?? 0) + 1;
    const doc = new this.auditModel({
      id: nextId,
      createdAt: new Date(),
      ...entry,
    });
    await doc.save();
    return doc.toObject();
  }

  async listar(q: ListaAuditoriaQuery) {
    const where: any = {};

    // Filtros de texto
    if (q.accion) where.accion = { $regex: new RegExp(q.accion, 'i') };
    if (q.nombreTabla) where.tableName = { $regex: new RegExp(q.nombreTabla, 'i') };
    if (q.idUsuario) where.idUsuario = q.idUsuario;

    // Filtros de fecha
    if (q.desde) where.createdAt = { ...(where.createdAt || {}), $gte: new Date(q.desde) };
    if (q.hasta)
      where.createdAt = {
        ...(where.createdAt || {}),
        $lte: new Date(q.hasta + 'T23:59:59.999Z'),
      };

    const take = Math.min(q.limite || 10, 100);
    const skip = ((q.pagina || 1) - 1) * take;

    const [data, total] = await Promise.all([
      this.auditModel
        .find(where)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take)
        .lean(),
      this.auditModel.countDocuments(where),
    ]);

    const totalPaginas = Math.ceil(total / take);

    return {
      total,
      pagina: q.pagina || 1,
      totalPaginas,
      limite: take,
      datos: data.map((item) => ({
        id: item.id,
        accion: item.accion,
        nombreTabla: item.tableName,
        idUsuario: item.idUsuario,
        datosAnteriores: item.oldData,
        datosNuevos: item.newData,
        ip: item.ip,
        agenteUsuario: item.agenteUsuario,
        fechaCreacion: item.createdAt,
      })),
    };
  }
}
