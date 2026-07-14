import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CulqiResult {
  success: boolean;
  transactionId: string;
  simulated?: boolean;
  response: any;
}

@Injectable()
export class CulqiService {
  private readonly logger = new Logger(CulqiService.name);
  private static readonly CHARGES_URL = 'https://api.culqi.com/v2/charges';
  private static readonly TIMEOUT_MS = 8000;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Cobra un cargo vía Culqi. Sin llave real → simula el cargo. Con llave real,
   * la llamada tiene timeout y, ante cualquier error, CAE al simulador para que
   * la demo nunca se quede trabada.
   */
  async processPayment(amountPen: number, paymentMethodToken: string): Promise<CulqiResult> {
    this.logger.log(`Procesando pago vía Culqi. Monto: S/ ${amountPen.toFixed(2)}`);

    const secretKey = this.configService.get<string>('CULQI_SECRET_KEY');

    // Sin llave real → simulación inmediata.
    if (!secretKey || secretKey === 'sk_test_XXXXX' || secretKey === 'TU_LLAVE_AQUI') {
      return this.simulate(amountPen);
    }

    // Con llave real: llamada con timeout + fallback a simulación.
    try {
      const res = await fetch(CulqiService.CHARGES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amountPen * 100), // Culqi usa céntimos
          currency_code: 'PEN',
          email: 'pasajero@chaskirutas.pe',
          source_id: paymentMethodToken,
          description: 'Viaje ChaskiRutas',
        }),
        signal: AbortSignal.timeout(CulqiService.TIMEOUT_MS),
      });
      const json: any = await res.json();

      if (!res.ok || json?.object === 'error') {
        this.logger.warn(`Culqi rechazó el cargo: ${json?.user_message ?? res.status}`);
        return { success: false, transactionId: '', response: json };
      }

      return { success: true, transactionId: json.id, simulated: false, response: json };
    } catch (err: any) {
      // Timeout / red caída → NO trabar la demo: simular el cargo.
      this.logger.warn(`Culqi no respondió (${err.message}); usando simulación.`);
      return this.simulate(amountPen);
    }
  }

  // Simulación del cruce con Culqi: respuesta con forma de cargo real y exitoso.
  private simulate(amountPen: number): CulqiResult {
    const rnd = Math.random().toString(36).substring(2, 12);
    const transactionId = `chr_test_${rnd}`;
    this.logger.log(`Culqi (simulado): cargo aprobado ${transactionId} por S/ ${amountPen.toFixed(2)}`);
    return {
      success: true,
      simulated: true,
      transactionId,
      response: {
        object: 'charge',
        id: transactionId,
        amount: Math.round(amountPen * 100),
        currency_code: 'PEN',
        reference_code: `CHR-${rnd.toUpperCase()}`,
        outcome: {
          type: 'venta_exitosa',
          code: 'AUT0000',
          merchant_message: 'Cargo procesado con éxito',
          user_message: 'Su compra ha sido exitosa.',
        },
        source: { object: 'token', iin: { card_brand: 'Visa', card_type: 'credito' } },
        metadata: { project: 'ChaskiRutas', simulated: true },
      },
    };
  }
}
