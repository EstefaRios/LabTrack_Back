import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { ModuleRef } from '@nestjs/core';
import { Optional } from '@nestjs/common';
import { JwtUser } from '../decorators/current-user.decorator';

// Extender el tipo Request para incluir la propiedad user
interface AuthenticatedRequest extends Request {
  user?: JwtUser;
  params: any;
  query: any;
  body: any;
}

@Injectable()
export class NotificationOwnerGuard implements CanActivate {
  constructor(private moduleRef: ModuleRef) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Obtener el ID de la notificación desde los parámetros
    const notificationId = request.params.id;

    if (!notificationId) {
      throw new ForbiddenException('ID de notificación requerido');
    }

    // Intentar obtener DataSource de manera opcional (puede no existir en modo Mongo)
    let dataSource: DataSource | undefined;
    try {
      dataSource = this.moduleRef.get(DataSource, { strict: false });
    } catch (e) {
      dataSource = undefined;
    }
    if (!dataSource) return true;

    // Verificar que la notificación pertenece al usuario en SQL
    const notification = await dataSource
      .createQueryBuilder()
      .select('n.id_usuario')
      .from('notification', 'n')
      .where('n.id = :id', { id: notificationId })
      .getRawOne();

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    if (notification.id_usuario !== user.sub) {
      throw new ForbiddenException(
        'No tienes permisos para modificar esta notificación',
      );
    }

    return true;
  }
}
