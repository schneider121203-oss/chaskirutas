import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethodEntity, Payment, Booking, Invoice } from '../entities';
import { SavePaymentMethodDto, PayBookingDto } from './dto';
import { PaymentStatus, BookingStatus } from '../common/enums';
import { CulqiService } from '../integrations/culqi.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentMethodEntity)
    private readonly methodRepo: Repository<PaymentMethodEntity>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly culqiService: CulqiService,
  ) {}

  async getMethods(userId: string) {
    return this.methodRepo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async saveMethod(userId: string, dto: SavePaymentMethodDto) {
    // If setting default, unset others first
    const newMethod = this.methodRepo.create({
      userId,
      method: dto.method,
      provider: 'Niubiz', // default provider
      maskedLabel: dto.maskedLabel || 'Tarjeta registrada',
      token: dto.token,
      isDefault: true,
    });

    await this.methodRepo.update({ userId }, { isDefault: false });
    return this.methodRepo.save(newMethod);
  }

  async deleteMethod(userId: string, id: string) {
    const method = await this.methodRepo.findOne({ where: { id, userId } });
    if (!method) throw new NotFoundException('Método de pago no encontrado');
    await this.methodRepo.remove(method);
    return { success: true };
  }

  async payBooking(userId: string, bookingId: string, dto: PayBookingDto) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, passengerId: userId },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');

    if (booking.status !== BookingStatus.PENDIENTE && booking.status !== BookingStatus.CONFIRMADO) {
      throw new BadRequestException(`No se puede pagar una reserva con estado ${booking.status}`);
    }

    const method = await this.methodRepo.findOne({
      where: { id: dto.paymentMethodId, userId },
    });
    if (!method) throw new BadRequestException('Método de pago seleccionado no válido');

    // Process via Culqi
    const charge = await this.culqiService.processPayment(
      Number(booking.totalPen),
      method.token || 'mock_token',
    );

    if (!charge.success) {
      throw new BadRequestException('El pago fue rechazado por la entidad bancaria');
    }

    const payment = this.paymentRepo.create({
      bookingId: booking.id,
      paymentMethodId: method.id,
      method: method.method,
      amountPen: booking.totalPen,
      status: PaymentStatus.PAGADO,
      pspProvider: 'Culqi',
      pspTransactionId: charge.transactionId,
      pspResponse: charge.response,
      paidAt: new Date(),
    });

    await this.paymentRepo.save(payment);

    booking.status = BookingStatus.CONFIRMADO;
    await this.bookingRepo.save(booking);

    return {
      success: true,
      transactionId: charge.transactionId,
      amountPen: booking.totalPen,
    };
  }

  /**
   * Webhook de Culqi (POST /payments/culqi-webhook).
   * Culqi notifica el resultado final de un cargo. Actualizamos el pago local
   * asociado a la transacción para reflejar el estado real (idempotente).
   */
  async handleCulqiWebhook(event: any) {
    const object = event?.data ?? event?.object ?? event;
    const chargeId = object?.id ?? event?.id;
    const eventType: string = event?.type ?? object?.type ?? 'charge.updated';

    if (!chargeId) {
      // Aceptamos igual para que Culqi no reintente indefinidamente.
      return { received: true, matched: false, reason: 'sin_charge_id' };
    }

    const payment = await this.paymentRepo.findOne({
      where: { pspTransactionId: chargeId },
    });
    if (!payment) {
      return { received: true, matched: false, chargeId };
    }

    // Mapear el tipo de evento de Culqi a nuestro estado interno.
    if (eventType.includes('success') || eventType === 'charge.updated') {
      payment.status = PaymentStatus.PAGADO;
      if (!payment.paidAt) payment.paidAt = new Date();
    } else if (eventType.includes('failed') || eventType.includes('expired')) {
      payment.status = PaymentStatus.FALLIDO;
    } else if (eventType.includes('refund')) {
      payment.status = PaymentStatus.REEMBOLSADO;
    }

    payment.pspResponse = event;
    await this.paymentRepo.save(payment);

    return { received: true, matched: true, chargeId, status: payment.status };
  }

  async getInvoice(bookingId: string) {
    const invoice = await this.invoiceRepo.findOne({
      where: { bookingId },
    });
    if (!invoice) throw new NotFoundException('Comprobante SUNAT no generado o no encontrado para este viaje');
    return invoice;
  }
}
