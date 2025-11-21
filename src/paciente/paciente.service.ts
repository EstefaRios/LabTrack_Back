import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Persona, PersonaDocument, Tarjetero, TarjeteroDocument, ListaOpcion, ListaOpcionDocument, Eps, EpsDocument } from '../database/mongo/schemas';

@Injectable()
export class PacienteService {
  constructor(
    @InjectModel(Persona.name) private personaModel: Model<PersonaDocument>,
    @InjectModel(Tarjetero.name) private tarjModel: Model<TarjeteroDocument>,
    @InjectModel(ListaOpcion.name) private listaModel: Model<ListaOpcionDocument>,
    @InjectModel(Eps.name) private epsModel: Model<EpsDocument>,
  ) {}

  async getPerfil(personaId: number) {
    const persona = await this.personaModel
      .findOne({ id: +personaId })
      .lean();
    if (!persona) throw new NotFoundException('Paciente no encontrado');
    
    const tarjetero = await this.tarjModel
      .findOne({ $or: [{ idPersona: +personaId }, { id_persona: +personaId }] })
      .lean();
    
    const pick = (obj: any, names: string[]) => {
      for (const n of names) {
        const v = obj?.[n];
        if (v !== undefined && v !== null) return v;
      }
      return undefined;
    };

    const idTipoId = pick(persona, ['idTipoId', 'id_tipoid']);
    const numeroId = pick(persona, ['numeroId', 'numeroid', 'num_documento', 'documento']);
    const fechaNac = pick(persona, ['fechaNac', 'fechanac', 'fecha_nac', 'fecha_nacimiento']);
    const idSexoBiologico = pick(persona, ['idSexoBiologico', 'id_sexobiologico']);
    const direccion = pick(persona, ['direccion', 'direccion_residencia']);
    const telMovil = pick(persona, ['telMovil', 'tel_movil', 'telefono']);
    const email = pick(persona, ['email', 'correo']);

    const tipoId = await this.listaModel
      .findOne(
        { variable: 'TipoIdentificacion', id: idTipoId },
        { descripcion: 1 },
      )
      .lean();
    const sexo = await this.listaModel
      .findOne(
        { variable: 'SexoBiologico', id: idSexoBiologico },
        { nombre: 1 },
      )
      .lean();

    let epsInfo: { codigo?: string; razonsocial?: string } = {};
    const idEps = pick(tarjetero, ['idEps', 'id_eps']);
    if (idEps) {
      const eps = await this.epsModel
        .findOne({ id: idEps }, { codigo: 1, razonsocial: 1 })
        .lean();
      epsInfo = eps ?? {};
    }

    return {
      id: persona.id,
      tipo: tipoId?.descripcion || 'No especificado',
      tipoId: tipoId?.descripcion || 'No especificado',
      numeroId,
      nombreCompleto: [
        persona.nombre1,
        persona.nombre2,
        persona.apellido1,
        persona.apellido2,
      ]
        .filter(Boolean)
        .join(' '),
      nombre1: persona.nombre1,
      nombre2: persona.nombre2,
      apellido1: persona.apellido1,
      apellido2: persona.apellido2,
      fechaNacimiento: fechaNac,
      fechaNac: fechaNac,
      sexo: sexo?.nombre || 'No especificado',
      idSexoBiologico,
      direccion,
      telefono: telMovil,
      telMovil,
      email,
      eps_codigo: epsInfo.codigo,
      eps_nombre: epsInfo.razonsocial,
      eps: epsInfo.razonsocial || 'No especificado',
    };
  }

  async listarPacientes(
    pagina: number = 1,
    limite: number = 50,
    busqueda?: string,
  ) {
    const where: any = {};
    if (busqueda) {
      const rx = new RegExp(busqueda, 'i');
      where.$or = [
        { nombre1: rx },
        { nombre2: rx },
        { apellido1: rx },
        { apellido2: rx },
        { numeroId: rx },
      ];
    }

    const skip = (pagina - 1) * limite;
    const [pacientes, total] = await Promise.all([
      this.personaModel
        .find(where, {
          id: 1,
          numeroId: 1,
          nombre1: 1,
          nombre2: 1,
          apellido1: 1,
          apellido2: 1,
          fechaNac: 1,
          idTipoId: 1,
        })
        .sort({ apellido1: 1, apellido2: 1, nombre1: 1 })
        .skip(skip)
        .limit(limite)
        .lean(),
      this.personaModel.countDocuments(where),
    ]);

    // Obtener abreviación/descripcion del tipo de documento en lote
    const tipoIds = Array.from(
      new Set(pacientes.map((p) => p.idTipoId).filter(Boolean)),
    );
    const tipos = await this.listaModel
      .find(
        { variable: 'TipoIdentificacion', id: { $in: tipoIds } },
        { id: 1, abreviacion: 1, descripcion: 1 },
      )
      .lean();
    const mapaTipos = new Map<number, { abreviacion?: string; descripcion?: string }>();
    tipos.forEach((t) => mapaTipos.set(t.id, { abreviacion: t.abreviacion, descripcion: t.descripcion }));

    return {
      data: pacientes.map((p) => ({
        id: p.id,
        numeroId: p.numeroId,
        nombreCompleto: [p.nombre1, p.nombre2, p.apellido1, p.apellido2]
          .filter(Boolean)
          .join(' '),
        nombre1: p.nombre1,
        nombre2: p.nombre2,
        apellido1: p.apellido1,
        apellido2: p.apellido2,
        fechaNac: p.fechaNac,
        tipoDocumento: mapaTipos.get(p.idTipoId)?.abreviacion,
        tipoDocumentoDesc: mapaTipos.get(p.idTipoId)?.descripcion,
      })),
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
    } as any;
  }
}
