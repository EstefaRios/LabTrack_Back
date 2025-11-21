import { Controller, Post, Body, Req, UseInterceptors, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginPacienteDto, LoginPacienteFlexibleDto } from './auth.dto';
import { Audit } from '../common/decorators/audit.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';

@ApiTags('Auth')
@Controller('auth')
@UseInterceptors(AuditInterceptor)
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login-paciente')
  @ApiOperation({
    summary: 'Login paciente por tipo, número y fecha de nacimiento',
  })
  @Audit('LOGIN_PACIENTE')
  async login(@Body() body: LoginPacienteFlexibleDto, @Req() req: any) {
    // Normalizar a los 3 campos requeridos
    const dto: LoginPacienteDto = {
      tipo:
        body.tipo ?? body.id_tipoid ?? (body as any).tipo_identificacion ?? (body as any).tipoId,
      numero:
        body.numero ?? body.numeroid ?? (body as any).numeroId ?? (body as any).num_documento,
      fechaNacimiento:
        body.fechaNacimiento ?? body.fechanac ?? (body as any).fecha_nac ?? (body as any).fecha_nacimiento,
    } as LoginPacienteDto;

    if (!dto.tipo || !dto.numero || !dto.fechaNacimiento) {
      throw new BadRequestException('Se requieren id_tipoid, numeroid y fechanac (o sus equivalentes)');
    }

    return this.auth.loginPaciente(dto, req.ipAddr || req.ip);
  }
}
