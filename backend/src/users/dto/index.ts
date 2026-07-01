import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'jorge.new@email.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Jorge Del Solar Modificado' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.com/new-photo.jpg' })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class UpdatePassengerDto {
  @ApiPropertyOptional({ example: 'Av. Arequipa 1234, Lince' })
  @IsOptional()
  @IsString()
  homeAddress?: string;

  @ApiPropertyOptional({ example: 'Av. Javier Prado Oeste 500, San Isidro' })
  @IsOptional()
  @IsString()
  workAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  preferredPaymentMethodId?: string;
}

export class CreateContactDto {
  @ApiProperty({ example: 'Mamá SOS' })
  @IsString()
  fullName!: string;

  @ApiPropertyOptional({ example: 'Madre' })
  @IsOptional()
  @IsString()
  relationship?: string;

  @ApiProperty({ example: '+51999888777' })
  @IsString()
  phoneE164!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
