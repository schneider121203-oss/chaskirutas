import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '../../common/enums';

export class SavePaymentMethodDto {
  @ApiProperty({ enum: PaymentMethodType, example: PaymentMethodType.TARJETA })
  @IsEnum(PaymentMethodType)
  method!: PaymentMethodType;

  @ApiPropertyOptional({ example: 'Visa •••• 4421' })
  @IsOptional()
  @IsString()
  maskedLabel?: string;

  @ApiProperty({ example: 'tok_test_visa_token' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class PayBookingDto {
  @ApiProperty({ example: '1', description: 'ID del método de pago guardado' })
  @IsString()
  @IsNotEmpty()
  paymentMethodId!: string;
}
