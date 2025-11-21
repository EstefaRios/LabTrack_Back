import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditController } from './auditoria.controller';
import { AuditService } from './auditoria.service';
import { Auditoria, AuditoriaSchema } from '../database/mongo/schemas/auditoria.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Auditoria.name, schema: AuditoriaSchema },
    ]),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
