import { IsString, IsNotEmpty, IsNumber, IsInt, IsEnum, Min, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RouteModality } from '../../common/enums';

export class CreateCollectiveDto {
  @ApiProperty({ example: 'R-015' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'Lima - Chosica' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: RouteModality, example: RouteModality.COLECTIVO_M1 })
  @IsEnum(RouteModality)
  modality!: RouteModality;

  @ApiProperty({ example: 1, description: 'ID de la jurisdicción reguladora' })
  @IsInt()
  jurisdictionId!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  originDistrictId!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  destinationDistrictId!: number;

  @ApiProperty({ example: 45.5 })
  @IsNumber()
  @Min(0)
  distanceKm!: number;

  @ApiProperty({ example: 15.00 })
  @IsNumber()
  @Min(0)
  baseFarePen!: number;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(2)
  seatsPerUnit!: number;
}

export class JoinCollectiveDto {
  @ApiProperty({ example: '12345678', description: 'DNI del pasajero para validar' })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'DNI debe tener 8 dígitos' })
  dni!: string;

  @ApiProperty({ example: 'tok_test_XXXXX', description: 'Token de pago Culqi para el 30% del pasaje' })
  @IsString()
  @IsNotEmpty()
  paymentToken!: string;
}
