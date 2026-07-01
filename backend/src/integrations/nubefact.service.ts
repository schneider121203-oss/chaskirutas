import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NubefactService {
  private readonly logger = new Logger(NubefactService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Simulates Nubefact electronic invoicing.
   */
  async generateInvoice(data: {
    dniOrRuc: string;
    fullName: string;
    amount: number;
    description: string;
  }): Promise<{ success: boolean; series: string; number: number; pdfUrl: string; xmlUrl: string; hash: string }> {
    this.logger.log(`Generando comprobante electrónico para ${data.fullName} (${data.dniOrRuc}) por S/ ${data.amount.toFixed(2)}`);

    const token = this.configService.get<string>('NUBEFACT_TOKEN');
    if (token && token !== 'TU_TOKEN_AQUI') {
      // Real API integration would go here.
    }

    const series = 'B001';
    const number = Math.floor(1000 + Math.random() * 9000);
    const hash = Math.random().toString(36).substring(2, 10).toUpperCase();

    return {
      success: true,
      series,
      number,
      pdfUrl: `https://facturacion.chaskirutas.pe/pdf/${series}-${number}.pdf`,
      xmlUrl: `https://facturacion.chaskirutas.pe/xml/${series}-${number}.xml`,
      hash
    };
  }
}
