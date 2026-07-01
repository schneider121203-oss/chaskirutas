import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CulqiService {
  private readonly logger = new Logger(CulqiService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Simulates/calls Culqi payment gateway.
   */
  async processPayment(amountPen: number, paymentMethodToken: string): Promise<{ success: boolean; transactionId: string; response: any }> {
    this.logger.log(`Procesando pago vía Culqi. Monto: S/ ${amountPen.toFixed(2)}`);

    const secretKey = this.configService.get<string>('CULQI_SECRET_KEY');
    if (secretKey && secretKey !== 'sk_test_XXXXX') {
      // Real API integration would go here.
    }

    // Mock transaction
    const transactionId = `chr_tx_${Math.random().toString(36).substring(2, 15)}`;
    return {
      success: true,
      transactionId,
      response: {
        object: 'charge',
        id: transactionId,
        amount: Math.round(amountPen * 100),
        currency_code: 'PEN',
        outcome: { type: 'venta_exitosa', code: 'AUT0000', merchant_message: 'Cargo procesado con éxito' },
        metadata: { project: 'ChaskiRutas' }
      }
    };
  }
}
