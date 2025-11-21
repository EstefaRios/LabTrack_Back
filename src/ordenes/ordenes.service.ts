import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Orden,
  Tarjetero,
  Procedimiento,
  Grupo,
  Prueba,
  OrdenResultado,
} from './ordenes.modelo';
import { Persona } from '../paciente/paciente.modelo';
import { ResultadosService } from '../resultados/resultados.service';
import { ResultadosMongoService } from '../resultados/resultados.mongo.service';
import {
  Orden as OrdenMongo,
  OrdenDocument,
  Tarjetero as TarjeteroMongo,
  TarjeteroDocument,
  Persona as PersonaMongo,
  PersonaDocument,
} from '../database/mongo/schemas';

@Injectable()
export class OrdenesService {
  constructor(
    // Primero dependencias requeridas
    private resultadosService: ResultadosService,
    @Optional() @InjectRepository(Orden)
    private ordenRepo?: Repository<Orden>,
    @Optional() @InjectRepository(Tarjetero)
    private tarjRepo?: Repository<Tarjetero>,
    @Optional() @InjectRepository(Procedimiento)
    private procRepo?: Repository<Procedimiento>,
    @Optional() @InjectRepository(Grupo)
    private grupoRepo?: Repository<Grupo>,
    @Optional() @InjectRepository(Prueba)
    private pruebaRepo?: Repository<Prueba>,
    @Optional() @InjectRepository(OrdenResultado)
    private resultadoRepo?: Repository<OrdenResultado>,
    @Optional() @InjectRepository(Persona)
    private personaRepo?: Repository<Persona>,
    @Optional() private resultadosMongo?: ResultadosMongoService,
    // Modelos Mongoose para listar en Mongo
    @InjectModel(OrdenMongo.name) private ordenModel?: Model<OrdenDocument>,
    @InjectModel(TarjeteroMongo.name)
    private tarjModel?: Model<TarjeteroDocument>,
    @InjectModel(PersonaMongo.name)
    private personaModel?: Model<PersonaDocument>,
  ) {}

  async listar(
    personaId: number,
    q: {
      pagina?: number;
      desde?: string;
      hasta?: string;
      busca?: string;
      asc?: boolean;
    },
  ) {
    // Si estamos en modo Mongo o no hay repos TypeORM, usar Mongoose
    if (
      process.env.DB_DRIVER === 'mongo' ||
      !this.ordenRepo ||
      !this.tarjRepo ||
      !this.personaRepo
    ) {
      if (!this.tarjModel || !this.ordenModel) {
        return { total: 0, pagina: 1, data: [] };
      }
      const tarjetas = await this.tarjModel
        .find({ $or: [{ idPersona: +personaId }, { id_persona: +personaId }] }, { id: 1 })
        .lean();
      const historias = tarjetas.map((t: any) => t.id);
      if (historias.length === 0) return { total: 0, pagina: 1, data: [] };

      const take = 10;
      const skip = ((q.pagina ?? 1) - 1) * take;
      const where: any = { $or: [{ idHistoria: { $in: historias } }, { id_historia: { $in: historias } }] };
      if (q.desde) where.fecha = { ...(where.fecha || {}), $gte: new Date(q.desde) };
      if (q.hasta)
        where.fecha = {
          ...(where.fecha || {}),
          $lte: new Date(q.hasta + 'T23:59:59.999Z'),
        };
      if (q.busca)
        where.orden = { $regex: new RegExp(q.busca, 'i') };

      const [rows, total] = await Promise.all([
        this.ordenModel
          .find(where, { id: 1, fecha: 1, orden: 1, idHistoria: 1, id_historia: 1 })
          .sort({ fecha: q.asc ? 1 : -1 })
          .skip(skip)
          .limit(take)
          .lean(),
        this.ordenModel.countDocuments(where),
      ]);

      // Obtener documento (numeroid) desde Persona
      const historiaIds = Array.from(new Set(rows.map((r: any) => r.idHistoria)));
      const tarjDocs = await this.tarjModel
        .find({ id: { $in: historiaIds } }, { id: 1, idPersona: 1 })
        .lean();
      const personaIds = Array.from(
        new Set(tarjDocs.map((t: any) => t.idPersona)),
      );
      const personas = this.personaModel
        ? await this.personaModel
            .find({ id: { $in: personaIds } }, { id: 1, numeroId: 1, numeroid: 1 })
            .lean()
        : [];
      const iTarj = new Map(tarjDocs.map((t: any) => [t.id, t.idPersona]));
      const iPersona = new Map(
        personas.map((p: any) => [p.id, p.numeroId ?? p.numeroid ?? ''])
      );

      const data = rows.map((o: any) => {
        const historiaId = o.idHistoria ?? o.id_historia;
        return {
          id: o.id,
          fecha: o.fecha,
          numero: o.orden,
          documento: iPersona.get(iTarj.get(historiaId)) || '',
        };
      });

      return { total, pagina: q.pagina ?? 1, data };
    }

    // Caso TypeORM (si aún está disponible)
    const tarjetas = await this.tarjRepo!.find({
      where: { idPersona: +personaId },
      select: ['id'],
    });
    const historias = tarjetas.map((t) => t.id);
    if (historias.length === 0) return { total: 0, pagina: 1, data: [] };

    const qb = this.ordenRepo!
      .createQueryBuilder('o')
      .leftJoin('fac_m_tarjetero', 't', 't.id = o.id_historia')
      .leftJoin('gen_m_persona', 'p', 'p.id = t.id_persona')
      .select([
        'o.id as id',
        'o.fecha as fecha',
        'o.orden as numero',
        'p.numeroid as documento',
      ])
      .where('o.id_historia IN (:...historias)', { historias });

    if (q.desde) qb.andWhere('o.fecha >= :desde', { desde: q.desde });
    if (q.hasta) qb.andWhere('o.fecha <= :hasta', { hasta: q.hasta });
    if (q.busca) qb.andWhere('o.orden::text ILIKE :q', { q: `%${q.busca}%` });

    qb.orderBy('o.fecha', q.asc ? 'ASC' : 'DESC');

    const take = 10,
      skip = ((q.pagina ?? 1) - 1) * take;
    const [data, total] = await Promise.all([
      qb.offset(skip).limit(take).getRawMany(),
      qb.getCount(),
    ]);
    return { total, pagina: q.pagina ?? 1, data };
  }

  async resultados(idOrden: number) {
    try {
      // Si estamos en modo Mongo, usar el servicio Mongo
      if (
        process.env.DB_DRIVER === 'mongo' ||
        process.env.MONGO_URI ||
        process.env.MONGODB_URI
      ) {
        if (!this.resultadosMongo) {
          return { grupos: [] };
        }
        return await this.resultadosMongo.getResultadosCompletos(idOrden);
      }

      // Usar el servicio mejorado para obtener resultados
      const resultadosCompletos =
        await this.resultadosService.getResultadosCompletos(idOrden);

      if (!resultadosCompletos || !resultadosCompletos.grupos) {
        return { grupos: [] };
      }

      // Convertir la estructura del servicio mejorado al formato esperado por el frontend
      const grupos = resultadosCompletos.grupos.map((grupo) => ({
        grupoId: grupo.grupoId,
        grupoCodigo: grupo.grupoCodigo,
        grupoNombre: grupo.grupoNombre,
        procedimientos: grupo.procedimientos.map((procedimiento) => ({
          procedimientoId: procedimiento.procedimientoId,
          procedimiento: {
            id: procedimiento.procedimiento.id,
            idCups: procedimiento.procedimiento.idCups,
            metodo: procedimiento.procedimiento.metodo,
            codigo: procedimiento.procedimiento.codigo,
            nombre: procedimiento.procedimiento.nombre,
          },
          pruebas: procedimiento.pruebas.map((pruebaConResultado) => ({
            prueba: {
              id: pruebaConResultado.prueba.id,
              codigoPrueba: pruebaConResultado.prueba.codigoPrueba,
              nombrePrueba: pruebaConResultado.prueba.nombrePrueba,
              unidad: pruebaConResultado.prueba.unidad,
              idTipoResultado: pruebaConResultado.prueba.idTipoResultado,
            },
            resultado: {
              id: pruebaConResultado.resultado.id,
              fecha: pruebaConResultado.resultado.fecha,
              idOrden: pruebaConResultado.resultado.idOrden,
              idProcedimiento: pruebaConResultado.resultado.idProcedimiento,
              idPrueba: pruebaConResultado.resultado.idPrueba,
              idPruebaOpcion: pruebaConResultado.resultado.idPruebaOpcion,
              resOpcion: pruebaConResultado.resultado.resOpcion,
              resNumerico: pruebaConResultado.resultado.resNumerico,
              resTexto: pruebaConResultado.resultado.resTexto,
              resMemo: pruebaConResultado.resultado.resMemo,
              numProcesamientos: pruebaConResultado.resultado.numProcesamientos,
              valor_ref_min: pruebaConResultado.resultado.valor_ref_min,
              valor_ref_max: pruebaConResultado.resultado.valor_ref_max,
            },
          })),
        })),
      }));

      // Obtener información completa del paciente desde el servicio mejorado
      const infoCompleta =
        await this.resultadosService.getInfoPacienteYOrden(idOrden);
      const infoPaciente = infoCompleta.paciente;
      const infoOrden = infoCompleta.orden;

      const pacienteMapeado = infoPaciente
        ? {
            id: infoPaciente.id,
            tipo_documento: infoPaciente.tipo_documento,
            numero_documento: infoPaciente.numero_documento,
            nombres: infoPaciente.nombres,
            apellidos: infoPaciente.apellidos,
            fecha_nacimiento: infoPaciente.fecha_nacimiento,
            genero: infoPaciente.genero,
            telefono: infoPaciente.telefono,
            email: infoPaciente.email,
            direccion: infoPaciente.direccion,
            eps_nombre: infoPaciente.eps_nombre,
            eps_codigo: infoPaciente.eps_codigo,
          }
        : null;

      const ordenMapeada = infoOrden
        ? {
            id: infoOrden.id,
            numero: infoOrden.numero,
            fecha: infoOrden.fecha,
            profesional_externo:
              infoOrden.profesional_externo || 'Médico no especificado',
          }
        : null;

      return {
        grupos,
        paciente: pacienteMapeado,
        orden: ordenMapeada,
      };
    } catch (error) {
      console.error(
        'Error obteniendo resultados con servicio mejorado:',
        error,
      );
      // Fallback al método original en caso de error
      return this.resultadosOriginal(idOrden);
    }
  }

  // Método original como fallback
  private async resultadosOriginal(idOrden: number) {
    if (!this.ordenRepo) return { grupos: [] };
    const orden = await this.ordenRepo.findOne({ where: { id: +idOrden } });
    if (!orden) return { grupos: [] };

    if (!this.resultadoRepo) return { grupos: [] };
    const rows = await this.resultadoRepo.find({
      where: { idOrden },
      order: { idProcedimiento: 'ASC', idPrueba: 'ASC', fecha: 'ASC' },
    });

    if (!rows.length) return { grupos: [] };

    const procIds = [...new Set(rows.map((r) => r.idProcedimiento))];
    const pruebaIds = [...new Set(rows.map((r) => r.idPrueba))];

    if (!this.procRepo || !this.pruebaRepo) return { grupos: [] };
    const [procedimientos, pruebas] = await Promise.all([
      this.procRepo.find({ where: { id: In(procIds) } }),
      this.pruebaRepo.find({ where: { id: In(pruebaIds) } }),
    ]);

    const gruposIds = [...new Set(procedimientos.map((p) => p.idGrupo))];
    if (!this.grupoRepo) return { grupos: [] };
    const grupos = await this.grupoRepo.find({ where: { id: In(gruposIds) } });

    const iProc = new Map(procedimientos.map((p) => [p.id, p]));
    const iPrueba = new Map(pruebas.map((p) => [p.id, p]));
    const iGrupo = new Map(grupos.map((g) => [g.id, g]));

    const out: any[] = [];
    const mGrupo = new Map<number, any>();

    for (const r of rows) {
      const proc = iProc.get(r.idProcedimiento);
      const grp = proc ? iGrupo.get(proc.idGrupo) : undefined;
      const pr = iPrueba.get(r.idPrueba);

      const gId = grp?.id ?? -1;
      if (!mGrupo.has(gId)) {
        mGrupo.set(gId, {
          grupoId: gId,
          grupoCodigo: grp?.codigo ?? 'NA',
          grupoNombre: grp?.nombre ?? 'SIN GRUPO',
          procedimientos: new Map(),
        });
      }
      const g = mGrupo.get(gId);
      const pId = proc?.id ?? -1;
      if (!g.procedimientos.has(pId))
        g.procedimientos.set(pId, {
          procedimientoId: pId,
          procedimiento: proc ?? null,
          pruebas: [],
        });
      g.procedimientos
        .get(pId)
        .pruebas.push({ prueba: pr ?? null, resultado: r });
    }

    for (const g of mGrupo.values()) {
      g.procedimientos = Array.from(g.procedimientos.values());
      out.push(g);
    }
    out.sort((a, b) =>
      String(a.grupoCodigo).localeCompare(String(b.grupoCodigo)),
    );
    return { grupos: out };
  }
}
