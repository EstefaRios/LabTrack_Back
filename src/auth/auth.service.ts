import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Persona, PersonaDocument, ListaOpcion, ListaOpcionDocument } from '../database/mongo/schemas';
import { LoginPacienteDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    // Primero dependencia requerida
    private jwt: JwtService,
    @InjectModel(Persona.name) private personaModel: Model<PersonaDocument>,
    @InjectModel(ListaOpcion.name) private listaModel: Model<ListaOpcionDocument>,
  ) {}

  async loginPaciente(dto: LoginPacienteDto, ip?: string) {
    const tipo = await this.listaModel
      .findOne({ variable: 'TipoIdentificacion', abreviacion: dto.tipo }, { id: 1 })
      .lean();
    if (!tipo) throw new NotFoundException('Tipo de identificación inválido');

    // Buscar por tipo y número admitiendo nombres de campos en snake_case (Atlas)
    const persona = await this.personaModel
      .findOne(
        {
          $and: [
            { $or: [{ idTipoId: tipo.id }, { id_tipoid: tipo.id }] },
            { $or: [{ numeroId: dto.numero }, { numeroid: dto.numero }] },
          ],
        },
        {
          id: 1,
          nombre1: 1,
          nombre2: 1,
          apellido1: 1,
          apellido2: 1,
          apellid01: 1,
          apellid02: 1,
          fechaNac: 1,
          fechanac: 1,
        },
      )
      .lean();
    if (!persona) throw new NotFoundException('Paciente no encontrado');

    const normalize = (s?: string): string | null => {
      if (!s) return null;
      const str = String(s).trim();
      // dd/mm/yyyy
      const m = str.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
      if (m) {
        const dd = m[1].padStart(2, '0');
        const mm = m[2].padStart(2, '0');
        const yyyy = m[3];
        return `${yyyy}-${mm}-${dd}`;
      }
      // yyyy-mm-dd...
      const iso = str.match(/^(\d{4}-\d{2}-\d{2})/);
      if (iso) return iso[1];
      // fallback Date parse
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return null;
    };

    const fechaDb = normalize((persona as any).fechaNac ?? (persona as any).fechanac ?? undefined);
    const fechaReq = normalize(dto.fechaNacimiento);
    if (!fechaDb || !fechaReq || fechaDb !== fechaReq) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const payload = { sub: persona.id, tipo: dto.tipo, ip };
    const token = await this.jwt.signAsync(payload, {
      expiresIn: process.env.JWT_EXPIRES || '2h',
    });

    return {
      access_token: token,
      personaId: persona.id,
      nombre: [persona.nombre1, (persona as any).nombre2].filter(Boolean).join(' '),
      apellidos: [persona.apellido1 ?? (persona as any).apellid01, persona.apellido2 ?? (persona as any).apellid02]
        .filter(Boolean)
        .join(' '),
    };
  }

  
}
