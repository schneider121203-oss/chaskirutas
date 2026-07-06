import { IsString, IsNotEmpty, IsOptional, IsInt, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentKind } from '../../common/enums';

export class UpdateDriverDto {
  @ApiPropertyOptional({ example: 'BCP' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: '•••• 1234' })
  @IsOptional()
  @IsString()
  bankAccountMasked?: string;

  @ApiPropertyOptional({ example: '00219300000000000018' })
  @IsOptional()
  @IsString()
  bankAccountCci?: string;
}

export class CreateVehicleDto {
  @ApiProperty({ example: 'ABC-123' })
  @IsString()
  @IsNotEmpty()
  plate!: string;

  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @IsNotEmpty()
  brand!: string;

  @ApiProperty({ example: 'Corolla' })
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiProperty({ example: 2022 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiPropertyOptional({ example: 'Negro' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: 5, description: 'Asientos totales incluyendo chofer' })
  @IsInt()
  @Min(2)
  seatsTotal!: number;

  @ApiPropertyOptional({ example: 'GLP' })
  @IsOptional()
  @IsString()
  fuelType?: string;
}

export class UploadDocumentDto {
  @ApiProperty({ enum: DocumentKind, example: DocumentKind.SOAT })
  @IsEnum(DocumentKind)
  kind!: DocumentKind;

  @ApiProperty({ example: 'SOAT-998811' })
  @IsString()
  @IsNotEmpty()
  documentNumber!: string;

  @ApiProperty({ example: 'https://docs.chaskirutas.pe/soat.jpg' })
  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  issuedAt?: string;

  @ApiPropertyOptional({ example: '2027-01-01' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

// Declaración Jurada para la TUC (ATU). Los datos personales/vehiculares se
// autocompletan desde la cuenta; aquí solo llegan los campos manuales + la
// aceptación bajo juramento.
export class SubmitDeclarationDto {
  @ApiPropertyOptional({ example: 'ABC123456', description: 'N° de motor del vehículo' })
  @IsOptional()
  @IsString()
  engineNumber?: string;

  @ApiPropertyOptional({ example: 'Blanco', description: 'Color del vehículo (si no estaba registrado)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'ATU-2026-000123', description: 'N° de autorización ATU (si lo tienes)' })
  @IsOptional()
  @IsString()
  atuAuthorization?: string;

  @ApiProperty({ example: true, description: 'Aceptación bajo juramento de las 9 declaraciones' })
  @IsBoolean()
  acceptedUnderOath!: boolean;
}
