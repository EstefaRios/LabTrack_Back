import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginPacienteDto {
  @ApiProperty({ example: 'CC' })
  @IsString()
  @IsNotEmpty()
  tipo: string;
  @ApiProperty({ example: '1000000000' })
  @IsString()
  @IsNotEmpty()
  numero: string;
  @ApiProperty({ example: '1990-01-01' })
  @IsDateString()
  fechaNacimiento: string;
}

// DTO flexible para aceptar nombres de campos en snake_case
export class LoginPacienteFlexibleDto {
  // camelCase tradicionales
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  numero?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  // snake_case (Atlas)
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  id_tipoid?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  numeroid?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fechanac?: string;
}
