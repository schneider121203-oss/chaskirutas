import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { SavePaymentMethodDto, PayBookingDto } from './dto';
import { CurrentUser } from '../common/decorators';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('methods')
  @ApiOperation({ summary: 'Obtener métodos de pago guardados del usuario' })
  getMethods(@CurrentUser() user: any) {
    return this.paymentsService.getMethods(user.sub);
  }

  @Post('methods')
  @ApiOperation({ summary: 'Guardar/Tokenizar un nuevo método de pago' })
  saveMethod(@CurrentUser() user: any, @Body() dto: SavePaymentMethodDto) {
    return this.paymentsService.saveMethod(user.sub, dto);
  }

  @Delete('methods/:id')
  @ApiOperation({ summary: 'Eliminar un método de pago' })
  deleteMethod(@CurrentUser() user: any, @Param('id') id: string) {
    return this.paymentsService.deleteMethod(user.sub, id);
  }

  @Post(':bookingId/pay')
  @ApiOperation({ summary: 'Pagar una reserva de viaje' })
  payBooking(
    @CurrentUser() user: any,
    @Param('bookingId') bookingId: string,
    @Body() dto: PayBookingDto,
  ) {
    return this.paymentsService.payBooking(user.sub, bookingId, dto);
  }

  @Get(':bookingId/invoice')
  @ApiOperation({ summary: 'Obtener comprobante de pago SUNAT (Boleta/Factura)' })
  getInvoice(@Param('bookingId') bookingId: string) {
    return this.paymentsService.getInvoice(bookingId);
  }
}
