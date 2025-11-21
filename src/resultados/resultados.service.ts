import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ResultadosApiResponseDto,
  GrupoConProcedimientosDto,
  PacienteDto,
  OrdenDto,
  EstadisticasResultadosDto,
  ProcedimientoConPruebasDto,
  PruebaConResultadoDto,
} from './resultados.dto';
import {
  ResultadosCompletos,
  InfoPacienteYOrden,
  EstadisticasResultados,
  RespuestaServicio,
  FiltroResultados,
  ESTADOS_RESULTADO,
  TIPOS_RESULTADO,
} from './resultados.model';
import { ResultadosMongoService } from './resultados.mongo.service';

// Interfaces para el procesamiento interno
interface ResultadoConsulta {
  resultado_id: number;
  fecha_resultado: string;
  id_orden: number;
  id_procedimiento: number;
  id_prueba: number;
  id_pruebaopcion?: number;
  res_opcion?: string;
  res_numerico?: number;
  res_texto?: string;
  res_memo?: string;
  num_procesamientos: number;
  codigo_prueba: string;
  nombre_prueba: string;
  id_tipo_resultado: number;
  unidad?: string;
  prueba_habilitada: boolean;
  procedimiento_id: number;
  id_cups: number;
  id_grupo_laboratorio: number;
  metodo?: string;
  grupo_id: number;
  grupo_codigo: string;
  grupo_nombre: string;
  grupo_habilitado: boolean;
  cups_codigo: string;
  cups_nombre: string;
  cups_habilitado: boolean;
  opcion?: string;
  opcion_min_m?: number;
  opcion_max_m?: number;
  opcion_min_f?: number;
  opcion_max_f?: number;
}

interface GrupoTemporal {
  grupoId: number;
  grupoCodigo: string;
  grupoNombre: string;
  procedimientos: Map<number, ProcedimientoConPruebasDto>;
}

@Injectable()
export class ResultadosService {
  constructor(
    @Optional()
    @InjectDataSource()
    private dataSource: DataSource | undefined,
    private mongoService: ResultadosMongoService,
  ) {}

  private isMongo(): boolean {
    return process.env.DB_DRIVER === 'mongo' || !this.dataSource;
  }

  /**
   * Obtiene resultados completos de una orden con información del paciente y estadísticas
   * @param idOrden - ID de la orden
   * @returns Resultados estructurados por grupos y procedimientos con información adicional
   */
  async getResultadosCompletos(
    idOrden: number,
  ): Promise<ResultadosApiResponseDto> {
    try {
      if (this.isMongo()) {
        const res = await this.mongoService.getResultadosCompletos(idOrden);
        // Calcular estadísticas básicas desde la estructura de grupos
        const totalPruebas = (res.grupos ?? []).reduce((acc: number, g: any) => {
          return (
            acc + (g.procedimientos ?? []).reduce((ap: number, p: any) => ap + (p.pruebas?.length ?? 0), 0)
          );
        }, 0);
        const totalProcedimientos = (res.grupos ?? []).reduce((acc: number, g: any) => {
          return acc + (g.procedimientos?.length ?? 0);
        }, 0);
        const totalGrupos = (res.grupos ?? []).length;
        const estadisticas: EstadisticasResultadosDto = {
          total_resultados: totalPruebas,
          total_procedimientos: totalProcedimientos,
          total_grupos: totalGrupos,
          resultados_numericos: 0,
          resultados_opcion: 0,
          resultados_texto: 0,
          resultados_memo: 0,
        };
        return {
          grupos: (res.grupos as unknown as GrupoConProcedimientosDto[]) ?? [],
          paciente: (res.paciente as unknown as PacienteDto) ?? undefined,
          orden: (res.orden as unknown as OrdenDto) ?? undefined,
          estadisticas,
        };
      } else {
        // Verificar que la orden existe
        const ordenInfo = await this.verificarOrden(idOrden);
        if (!ordenInfo) {
          throw new NotFoundException(`Orden con ID ${idOrden} no encontrada`);
        }

        // Obtener resultados, información del paciente y estadísticas en paralelo
        const [grupos, pacienteInfo, estadisticas] = await Promise.all([
          this.getGruposConResultados(idOrden),
          this.getInfoPacienteYOrden(idOrden),
          this.getEstadisticasResultados(idOrden),
        ]);

        return {
          grupos,
          paciente: pacienteInfo.paciente,
          orden: pacienteInfo.orden,
          estadisticas,
        };
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error obteniendo resultados completos:', error);
      throw new InternalServerErrorException(
        'Error interno del servidor al obtener resultados',
      );
    }
  }

  /**
   * Obtiene solo los grupos con resultados de una orden
   * @param idOrden - ID de la orden
   * @returns Grupos estructurados con procedimientos y pruebas
   */
  async getGruposConResultados(
    idOrden: number,
  ): Promise<GrupoConProcedimientosDto[]> {
    if (this.isMongo()) {
      const res = await this.mongoService.getResultadosCompletos(idOrden);
      return (res.grupos as unknown as GrupoConProcedimientosDto[]) ?? [];
    }
    const query = `
      SELECT
        r.id as resultado_id,
        r.fecha as fecha_resultado,
        r.id_orden,
        r.id_procedimiento,
        r.id_prueba,
        r.id_pruebaopcion,
        r.res_opcion,
        r.res_numerico,
        r.res_texto,
        r.res_memo,
        r.num_procesamientos,

        -- Información de la prueba
        pr.codigo_prueba,
        pr.nombre_prueba,
        pr.id_tipo_resultado,
        pr.unidad,
        pr.habilita as prueba_habilitada,

        -- Información del procedimiento
        proc.id as procedimiento_id,
        proc.id_cups,
        proc.id_grupo_laboratorio,
        proc.metodo,

        -- Información del grupo
        g.id as grupo_id,
        g.codigo as grupo_codigo,
        g.nombre as grupo_nombre,
        g.habilita as grupo_habilitado,

        -- Información de CUPS
        cups.codigo as cups_codigo,
        cups.nombre as cups_nombre,
        cups.habilita as cups_habilitado,

        -- Opciones de prueba (si aplica)
        po.opcion,
        po.valor_ref_min_m as opcion_min_m,
        po.valor_ref_max_m as opcion_max_m,
        po.valor_ref_min_f as opcion_min_f,
        po.valor_ref_max_f as opcion_max_f

      FROM lab_m_orden_resultados r
      INNER JOIN lab_p_pruebas pr ON r.id_prueba = pr.id
      INNER JOIN lab_p_procedimientos proc ON r.id_procedimiento = proc.id
      INNER JOIN lab_p_grupos g ON proc.id_grupo_laboratorio = g.id
      INNER JOIN fac_p_cups cups ON proc.id_cups = cups.id
      LEFT JOIN lab_p_pruebas_opciones po ON r.id_pruebaopcion = po.id
      WHERE r.id_orden = $1
      ORDER BY g.nombre, cups.nombre, pr.nombre_prueba
    `;

    const resultados = await this.dataSource!.query(query, [idOrden]);
    return this.formatearResultados(resultados);
  }

  /**
   * Obtiene información del paciente y orden asociados a una orden
   * @param idOrden - ID de la orden
   * @returns Información del paciente y orden
   */
  async getInfoPacienteYOrden(
    idOrden: number,
  ): Promise<{ paciente: PacienteDto; orden: OrdenDto }> {
    if (this.isMongo()) {
      const res = await this.mongoService.getResultadosCompletos(idOrden);
      if (!res.orden) {
        throw new NotFoundException(`Orden con ID ${idOrden} no encontrada`);
      }
      return {
        paciente: (res.paciente as unknown as PacienteDto) ?? {
          id: 0,
          tipo_documento: 'No especificado',
          numero_documento: '',
          nombres: '',
          apellidos: '',
          fecha_nacimiento: '',
          genero: 'No especificado',
        },
        orden: res.orden as unknown as OrdenDto,
      };
    }
    console.log(
      '=== EJECUTANDO getInfoPacienteYOrden para orden:',
      idOrden,
      '===',
    );
    const query = `
      SELECT 
        o.id as orden_id,
        o.orden,
        o.fecha as fecha_orden,
        o.id_historia,
        o.profesional_externo,
        
        -- Información del paciente desde tarjetero
        t.id as tarjetero_id,
        
        -- Información personal del paciente
        p.id as paciente_id,
        p.numeroid,
        p.apellido1,
        p.apellido2,
        p.nombre1,
        p.nombre2,
        p.fechanac,
        p.id_sexobiologico,
        p.direccion,
        p.tel_movil,
        p.email,
        
        -- Información del tipo de documento del paciente
        doc.codigo as tipo_doc_codigo,
        doc.nombre as tipo_doc_nombre,
        
        -- Información de EPS
        eps.codigo as eps_codigo,
        eps.razonsocial as eps_nombre,
        
        -- Información del sexo biológico
        sexo.nombre as sexo_descripcion,
        
        -- Información del profesional que ordenó (si no es externo)
        prof_p.nombre1 as prof_nombre1,
        prof_p.nombre2 as prof_nombre2,
        prof_p.apellido1 as prof_apellido1,
        prof_p.apellido2 as prof_apellido2,
        prof.registro_medico
        
      FROM lab_m_orden o
      LEFT JOIN fac_m_tarjetero t ON o.id_historia = t.id
      LEFT JOIN gen_m_persona p ON t.id_persona = p.id
      LEFT JOIN gen_p_documento doc ON p.id_tipoid = doc.id
      LEFT JOIN gen_p_eps eps ON t.id_eps = eps.id
      LEFT JOIN gen_p_listaopcion sexo ON p.id_sexobiologico = sexo.id AND sexo.variable = 'SexoBiologico'
      LEFT JOIN fac_p_profesional prof ON o.id_profesional_ordena = prof.id
      LEFT JOIN gen_m_persona prof_p ON prof.id_persona = prof_p.id
      WHERE o.id = $1
    `;

    const resultado = await this.dataSource!.query(query, [idOrden]);
    const data = resultado[0];

    if (!data) {
      throw new NotFoundException(
        `No se encontró información para la orden ${idOrden}`,
      );
    }

    const paciente: PacienteDto = {
      id: data.paciente_id || 0,
      tipo_documento: data.tipo_doc_nombre || 'No especificado',
      numero_documento: data.numeroid || '',
      nombres: [data.nombre1, data.nombre2].filter(Boolean).join(' '),
      apellidos: [data.apellido1, data.apellido2].filter(Boolean).join(' '),
      fecha_nacimiento: data.fechanac || '',
      genero: data.sexo_descripcion || 'No especificado',
      telefono: data.tel_movil,
      email: data.email,
      direccion: data.direccion,
      eps_nombre: data.eps_nombre,
      eps_codigo: data.eps_codigo,
    };

    // Construir el nombre del médico
    let nombreMedico: string;

    if (data.profesional_externo === true) {
      // Es un profesional externo, no hay datos en las tablas relacionadas
      nombreMedico = 'Profesional Externo';
    } else if (
      data.prof_nombre1 ||
      data.prof_nombre2 ||
      data.prof_apellido1 ||
      data.prof_apellido2
    ) {
      // Es un profesional interno con datos disponibles
      nombreMedico = [
        data.prof_nombre1,
        data.prof_nombre2,
        data.prof_apellido1,
        data.prof_apellido2,
      ]
        .filter(Boolean)
        .join(' ');
    } else {
      // Caso por defecto
      nombreMedico = 'No especificado';
    }

    console.log('Debug - Datos del profesional:', {
      prof_nombre1: data.prof_nombre1,
      prof_nombre2: data.prof_nombre2,
      prof_apellido1: data.prof_apellido1,
      prof_apellido2: data.prof_apellido2,
      profesional_externo: data.profesional_externo,
      nombreMedico: nombreMedico,
      id_profesional_ordena: data.id_profesional_ordena,
      orden_id: data.orden_id,
    });

    const orden: OrdenDto = {
      id: data.orden_id,
      numero: data.orden || '',
      fecha: data.fecha_orden || '',
      profesional_externo: nombreMedico,
    };

    return { paciente, orden };
  }

  /**
   * Verifica si existe una orden
   * @param idOrden - ID de la orden
   * @returns Información básica de la orden
   */
  async verificarOrden(idOrden: number): Promise<OrdenDto | null> {
    if (this.isMongo()) {
      const res = await this.mongoService.getResultadosCompletos(idOrden);
      return (res.orden as unknown as OrdenDto) ?? null;
    }
    const query = `
      SELECT id, orden, fecha, id_historia, id_profesional_ordena, profesional_externo
      FROM lab_m_orden 
      WHERE id = $1
    `;

    const resultado = await this.dataSource!.query(query, [idOrden]);
    const data = resultado[0];

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      numero: data.orden || '',
      fecha: data.fecha || '',
      profesional_externo: data.profesional_externo,
    };
  }

  async getEstadisticasResultados(idOrden: number): Promise<EstadisticasResultadosDto> {
    if (this.isMongo()) {
      const res = await this.mongoService.getResultadosCompletos(idOrden);
      const totalResultados = (res.grupos ?? []).reduce((acc: number, g: any) => {
        return (
          acc + (g.procedimientos ?? []).reduce((ap: number, p: any) => ap + (p.pruebas?.length ?? 0), 0)
        );
      }, 0);
      const totalProcedimientos = (res.grupos ?? []).reduce((acc: number, g: any) => {
        return acc + (g.procedimientos?.length ?? 0);
      }, 0);
      const totalGrupos = (res.grupos ?? []).length;
      return {
        total_resultados: totalResultados,
        total_procedimientos: totalProcedimientos,
        total_grupos: totalGrupos,
        resultados_numericos: 0,
        resultados_opcion: 0,
        resultados_texto: 0,
        resultados_memo: 0,
      };
    }
    // En entorno SQL, mantener la implementación existente (si hay). Si no, estimación básica.
    const grupos = await this.getGruposConResultados(idOrden);
    const totalResultados = grupos.reduce((acc: number, g: any) => {
      return (
        acc + (g.procedimientos ?? []).reduce((ap: number, p: any) => ap + (p.pruebas?.length ?? 0), 0)
      );
    }, 0);
    const totalProcedimientos = grupos.reduce((acc: number, g: any) => acc + (g.procedimientos?.length ?? 0), 0);
    const totalGrupos = grupos.length;
    return {
      total_resultados: totalResultados,
      total_procedimientos: totalProcedimientos,
      total_grupos: totalGrupos,
      resultados_numericos: 0,
      resultados_opcion: 0,
      resultados_texto: 0,
      resultados_memo: 0,
    };
  }

  

  /**
   * Formatea los resultados en una estructura jerárquica
   * @param resultados - Resultados de la consulta
   * @returns Estructura formateada
   */
  private formatearResultados(
    resultados: ResultadoConsulta[],
  ): GrupoConProcedimientosDto[] {
    const grupos = new Map<number, GrupoTemporal>();

    resultados.forEach((resultado) => {
      // Crear o obtener grupo
      if (!grupos.has(resultado.grupo_id)) {
        grupos.set(resultado.grupo_id, {
          grupoId: resultado.grupo_id,
          grupoCodigo: resultado.grupo_codigo,
          grupoNombre: resultado.grupo_nombre,
          procedimientos: new Map<number, ProcedimientoConPruebasDto>(),
        });
      }

      const grupo = grupos.get(resultado.grupo_id)!;

      // Crear o obtener procedimiento
      if (!grupo.procedimientos.has(resultado.procedimiento_id)) {
        grupo.procedimientos.set(resultado.procedimiento_id, {
          procedimientoId: resultado.procedimiento_id,
          procedimiento: {
            id: resultado.procedimiento_id,
            idCups: resultado.id_cups,
            metodo: resultado.metodo,
            codigo: resultado.cups_codigo,
            nombre: resultado.cups_nombre,
          },
          pruebas: [],
        });
      }

      const procedimiento = grupo.procedimientos.get(
        resultado.procedimiento_id,
      )!;

      // Determinar el valor del resultado y valores de referencia
      let valor_ref_min: number | undefined = undefined;
      let valor_ref_max: number | undefined = undefined;

      if (resultado.opcion_min_f !== null || resultado.opcion_min_m !== null) {
        valor_ref_min =
          resultado.opcion_min_f ?? resultado.opcion_min_m ?? undefined;
      }
      if (resultado.opcion_max_f !== null || resultado.opcion_max_m !== null) {
        valor_ref_max =
          resultado.opcion_max_f ?? resultado.opcion_max_m ?? undefined;
      }

      // Agregar prueba con resultado
      const pruebaConResultado: PruebaConResultadoDto = {
        prueba: {
          id: resultado.id_prueba,
          codigoPrueba: resultado.codigo_prueba,
          nombrePrueba: resultado.nombre_prueba,
          unidad: resultado.unidad,
          idTipoResultado: resultado.id_tipo_resultado,
        },
        resultado: {
          id: resultado.resultado_id,
          fecha: resultado.fecha_resultado,
          idOrden: resultado.id_orden,
          idProcedimiento: resultado.procedimiento_id,
          idPrueba: resultado.id_prueba,
          idPruebaOpcion: resultado.id_pruebaopcion,
          resOpcion: resultado.res_opcion,
          resNumerico: resultado.res_numerico,
          resTexto: resultado.res_texto,
          resMemo: resultado.res_memo,
          numProcesamientos: resultado.num_procesamientos,
          valor_ref_min,
          valor_ref_max,
        },
      };

      procedimiento.pruebas.push(pruebaConResultado);
    });

    // Convertir Maps a arrays
    return Array.from(grupos.values()).map((grupo) => ({
      ...grupo,
      procedimientos: Array.from(grupo.procedimientos.values()),
    }));
  }
}
