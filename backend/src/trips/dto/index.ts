import { IsString, IsNotEmpty, IsNumber, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TripCategory {
  ESTANDAR = 'ESTANDAR',
  CONFORT = 'CONFORT',
  XL = 'XL',
}

export class EstimateTripDto {
  @ApiProperty({ example: -12.046374, description: 'Latitud origen' })
  @IsNumber()
  startLat!: number;

  @ApiProperty({ example: -77.042793, description: 'Longitud origen' })
  @IsNumber()
  startLng!: number;

  @ApiProperty({ example: -12.092147, description: 'Latitud destino' })
  @IsNumber()
  endLat!: number;

  @ApiProperty({ example: -77.022143, description: 'Longitud destino' })
  @IsNumber()
  endLng!: number;

  @ApiPropertyOptional({
    enum: TripCategory,
    example: TripCategory.ESTANDAR,
    description: 'Categoría del viaje. Por defecto ESTANDAR (x1.0)',
  })
  @IsOptional()
  @IsEnum(TripCategory)
  category?: TripCategory;
}

export class RequestTripDto {
  @ApiProperty({ example: 1, description: 'ID de la Ruta base' })
  @IsInt()
  routeId!: number;

  @ApiProperty({ example: -12.046374 })
  @IsNumber()
  startLat!: number;

  @ApiProperty({ example: -77.042793 })
  @IsNumber()
  startLng!: number;

  @ApiProperty({ example: -12.092147 })
  @IsNumber()
  endLat!: number;

  @ApiProperty({ example: -77.022143 })
  @IsNumber()
  endLng!: number;

  @ApiProperty({ example: 15.00, description: 'Tarifa propuesta' })
  @IsNumber()
  proposedFare!: number;
}

export class UpdateTripStatusDto {
  @ApiProperty({ example: 'EN_CURSO', enum: ['EN_CAMINO', 'EN_CURSO', 'COMPLETADO', 'CANCELADO_PASAJERO'] })
  @IsString()
  @IsNotEmpty()
  status!: string;
}

export class StreamLocationDto {
  @ApiProperty({ example: -12.046374 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: -77.042793 })
  @IsNumber()
  longitude!: number;

  @ApiPropertyOptional({ example: 35.5 })
  @IsOptional()
  @IsNumber()
  speedKmh?: number;

  @ApiPropertyOptional({ example: 180 })
  @IsOptional()
  @IsInt()
  headingDeg?: number;
}

export class RateTripDto {
  @ApiProperty({ example: 5, description: 'Puntuación 1 a 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @ApiPropertyOptional({ example: ['Puntual', 'Amable'] })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: 'Excelente servicio' })
  @IsOptional()
  @IsString()
  comment?: string;
}
