import { IsString, IsNotEmpty, IsOptional, IsEnum, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: '+51987654321', description: 'Teléfono en formato E.164' })
  @IsString()
  @Matches(/^\+51\d{9}$/, { message: 'Teléfono debe ser formato +51XXXXXXXXX' })
  phone!: string;

  @ApiProperty({ example: 'miContraseña123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Jorge Del Solar' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'DNI debe tener 8 dígitos' })
  dni!: string;

  @ApiProperty({ example: 'PASAJERO', enum: ['PASAJERO', 'CONDUCTOR'] })
  @IsEnum(['PASAJERO', 'CONDUCTOR'])
  role!: 'PASAJERO' | 'CONDUCTOR';

  @ApiPropertyOptional({ example: 'jorge@email.com' })
  @IsOptional()
  @IsString()
  email?: string;

  // Campos extra solo para CONDUCTOR
  @ApiPropertyOptional({ example: 'Q12345678' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional({ example: 'A-IIa' })
  @IsOptional()
  @IsString()
  licenseClass?: string;

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsOptional()
  @IsString()
  licenseExpiresAt?: string;
}

export class OtpSendDto {
  @ApiProperty({ example: '+51987654321' })
  @IsString()
  @Matches(/^\+51\d{9}$/, { message: 'Teléfono debe ser formato +51XXXXXXXXX' })
  phone!: string;
}

export class OtpVerifyDto {
  @ApiProperty({ example: '+51987654321' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'OTP debe ser 4-6 dígitos' })
  code!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}
