import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Orden,
  OrdenDocument,
  Persona,
  PersonaDocument,
  OrdenResultado,
  OrdenResultadoDocument,
  Grupo,
  GrupoDocument,
  Procedimiento,
  ProcedimientoDocument,
  Prueba,
  PruebaDocument,
  Tarjetero,
  TarjeteroDocument,
} from '../database/mongo/schemas';

@Injectable()
export class ResultadosMongoService {
  constructor(
    @InjectModel(Orden.name) private ordenModel: Model<OrdenDocument>,
    @InjectModel(Persona.name) private personaModel: Model<PersonaDocument>,
    @InjectModel(OrdenResultado.name)
    private resultadoModel: Model<OrdenResultadoDocument>,
    @InjectModel(Grupo.name) private grupoModel: Model<GrupoDocument>,
    @InjectModel(Procedimiento.name)
    private procModel: Model<ProcedimientoDocument>,
    @InjectModel(Prueba.name) private pruebaModel: Model<PruebaDocument>,
    @InjectModel(Tarjetero.name) private tarjeteroModel: Model<TarjeteroDocument>,
  ) {}

  async getResultadosCompletos(idOrden: number) {
    // Si aún no hay datos migrados, devolvemos estructura vacía compatible
    const orden = await this.ordenModel
      .findOne({ id: idOrden })
      .lean();

    // Determinar nombre del médico, siguiendo la lógica del servicio SQL
    let nombreMedico: string | undefined = undefined;
    if (orden) {
      const esExterno = (orden as any).profesionalExterno ?? (orden as any).profesional_externo;
      if (esExterno === true) {
        nombreMedico = 'Profesional Externo';
      } else {
        const idProf = (orden as any).idProfesional ?? (orden as any).id_profesional_ordena;
        if (idProf) {
          const personaProf = await this.personaModel.findOne({ id: idProf }).lean();
          if (personaProf) {
            nombreMedico = [
              (personaProf as any).nombre1,
              (personaProf as any).nombre2,
              (personaProf as any).apellido1,
              (personaProf as any).apellido2,
            ]
              .filter(Boolean)
              .join(' ');
          }
        }
        if (!nombreMedico) nombreMedico = 'Médico no especificado';
      }
    }

    // En Mongo, obtenemos persona a través del Tarjetero (idHistoria -> Tarjetero -> idPersona)
    let pacienteInfo: any = null;
    const historiaId = (orden as any)?.idHistoria ?? (orden as any)?.id_historia;
    if (historiaId) {
      const tarj = await this.tarjeteroModel
        .findOne({ id: historiaId })
        .lean();
      const personaId = (tarj as any)?.idPersona ?? (tarj as any)?.id_persona;
      if (personaId) {
        pacienteInfo = await this.personaModel
          .findOne({ id: personaId })
          .lean();
      }
    }

    // Resultados por orden
    const resultados = await this.resultadoModel
      .find({ $or: [{ idOrden }, { id_orden: idOrden }] })
      .lean();
    if (!resultados.length) {
      return {
        grupos: [],
        paciente: pacienteInfo
          ? {
              id: pacienteInfo.id,
              numeroid: pacienteInfo.numeroId,
              nombre1: pacienteInfo.nombre1,
              nombre2: pacienteInfo.nombre2,
              apellido1: pacienteInfo.apellido1,
              apellido2: pacienteInfo.apellido2,
              fechanac: pacienteInfo.fechaNac,
              id_sexobiologico: pacienteInfo.idSexoBiologico,
              direccion: pacienteInfo.direccion,
              tel_movil: pacienteInfo.telMovil,
              email: pacienteInfo.email,
            }
          : null,
        orden: orden
          ? {
              id: (orden as any).id,
              numero: (orden as any).orden,
              fecha: (orden as any).fecha,
              profesional_externo: nombreMedico,
            }
          : null,
        estadisticas: null,
      };
    }

    // Agrupar resultados por grupo y procedimiento
    const procIds = Array.from(
      new Set(
        resultados.map((r) => (r as any).idProcedimiento ?? (r as any).id_procedimiento),
      ),
    ).filter((v) => typeof v === 'number');
    const procedimientos = await this.procModel
      .find({ id: { $in: procIds } })
      .lean();

    const gruposIds = Array.from(
      new Set(
        procedimientos.map((p: any) => p.idGrupo ?? p.id_grupo_laboratorio),
      ),
    ).filter((v) => typeof v === 'number');
    const grupos = await this.grupoModel
      .find({ id: { $in: gruposIds } })
      .lean();

    const pruebasIds = Array.from(
      new Set(
        resultados.map((r) => (r as any).idPrueba ?? (r as any).id_prueba),
      ),
    ).filter((v) => typeof v === 'number');
    const pruebas = await this.pruebaModel
      .find({ id: { $in: pruebasIds } })
      .lean();

    const iProc = new Map(procedimientos.map((p) => [p.id, p]));
    const iGrupo = new Map(grupos.map((g) => [g.id, g]));
    const iPrueba = new Map(pruebas.map((p) => [p.id, p]));

    const out: any[] = [];
    const mGrupo = new Map<number, any>();

    for (const r of resultados) {
      const idProcedimiento = (r as any).idProcedimiento ?? (r as any).id_procedimiento;
      const idPrueba = (r as any).idPrueba ?? (r as any).id_prueba;
      const proc = iProc.get(idProcedimiento);
      const procGrupoId = (proc as any)?.idGrupo ?? (proc as any)?.id_grupo_laboratorio;
      const grp = proc ? iGrupo.get(procGrupoId) : undefined;
      const pr = iPrueba.get(idPrueba);

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
      const resultadoNormalizado = {
        id: (r as any).id,
        fecha: (r as any).fecha,
        // camelCase esperados por frontend
        idOrden: (r as any).idOrden ?? (r as any).id_orden,
        idProcedimiento,
        idPrueba,
        idPruebaOpcion:
          (r as any).idPruebaOpcion ?? (r as any).id_pruebaopcion,
        resOpcion: (r as any).resOpcion ?? (r as any).res_opcion,
        resNumerico: (r as any).resNumerico ?? (r as any).res_numerico,
        resTexto: (r as any).resTexto ?? (r as any).res_texto,
        resMemo: (r as any).resMemo ?? (r as any).res_memo,
        numProcesamientos:
          (r as any).numProcesamientos ?? (r as any).num_procesamientos,
        // snake_case para compatibilidad adicional
        id_orden: (r as any).idOrden ?? (r as any).id_orden,
        id_procedimiento: idProcedimiento,
        id_prueba: idPrueba,
        id_pruebaopcion:
          (r as any).idPruebaOpcion ?? (r as any).id_pruebaopcion,
        res_opcion: (r as any).resOpcion ?? (r as any).res_opcion,
        res_numerico: (r as any).resNumerico ?? (r as any).res_numerico,
        res_texto: (r as any).resTexto ?? (r as any).res_texto,
        res_memo: (r as any).resMemo ?? (r as any).res_memo,
        num_procesamientos:
          (r as any).numProcesamientos ?? (r as any).num_procesamientos,
      };

      const pruebaNormalizada = pr
        ? {
            id: (pr as any).id,
            codigoPrueba:
              (pr as any).codigoPrueba ?? (pr as any).codigo_prueba ?? null,
            nombrePrueba:
              (pr as any).nombrePrueba ?? (pr as any).nombre_prueba ?? null,
            unidad: (pr as any).unidad ?? (pr as any).unidad_medida ?? null,
            idTipoResultado:
              (pr as any).idTipoResultado ?? (pr as any).id_tipo_resultado ?? null,
          }
        : null;
      g.procedimientos
        .get(pId)
        .pruebas.push({ prueba: pruebaNormalizada, resultado: resultadoNormalizado });
    }

    for (const g of mGrupo.values()) {
      g.procedimientos = Array.from(g.procedimientos.values());
      out.push(g);
    }
    out.sort((a, b) =>
      String(a.grupoCodigo).localeCompare(String(b.grupoCodigo)),
    );

    return {
      grupos: out,
      paciente: pacienteInfo
        ? {
            id: pacienteInfo.id,
            numeroid: pacienteInfo.numeroId ?? (pacienteInfo as any).numeroid,
            nombre1: pacienteInfo.nombre1,
            nombre2: pacienteInfo.nombre2,
            apellido1: pacienteInfo.apellido1 ?? (pacienteInfo as any).apellid01,
            apellido2: pacienteInfo.apellido2 ?? (pacienteInfo as any).apellid02,
            fechanac: pacienteInfo.fechaNac ?? (pacienteInfo as any).fechanac,
            id_sexobiologico:
              pacienteInfo.idSexoBiologico ?? (pacienteInfo as any).id_sexobiologico,
            direccion: pacienteInfo.direccion ?? (pacienteInfo as any).direccion_residencia,
            tel_movil: pacienteInfo.telMovil ?? (pacienteInfo as any).tel_movil,
            email: pacienteInfo.email ?? (pacienteInfo as any).correo,
          }
        : null,
      orden: orden
        ? {
            id: (orden as any).id,
            numero: (orden as any).orden,
            fecha: (orden as any).fecha,
            profesional_externo: nombreMedico,
          }
        : null,
      estadisticas: null,
    };
  }
}