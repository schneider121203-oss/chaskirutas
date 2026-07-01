import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReniecService {
  private readonly logger = new Logger(ReniecService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Simulates/calls apidni.com verification.
   * If token is provided in env, it can do a real call, otherwise mock responses for testing accounts.
   */
  async verifyDni(dni: string): Promise<{ success: boolean; fullName: string; dni: string }> {
    this.logger.log(`Verificando DNI: ${dni}`);
    
    // Check if real API token is configured
    const token = this.configService.get<string>('RENIEC_API_TOKEN');
    if (token && token !== 'TU_TOKEN_AQUI') {
      try {
        // Implement real HTTP call to apidni.com here if necessary.
        // For development/demo, we fall back to mock.
      } catch (err: any) {
        this.logger.error(`Error llamando a apidni.com: ${err.message}`);
      }
    }

    // Mock accounts from README/CSV
    const mockDb: Record<string, string> = {
      '98765432': 'Carlos Mendoza',
      '97654321': 'María Quispe',
      '96543210': 'Pedro Huamán',
      '91234567': 'Jorge Del Solar',
      '92345678': 'Ana García',
    };

    if (mockDb[dni]) {
      return { success: true, fullName: mockDb[dni], dni };
    }

    // Default dynamic mock name for any other DNI
    return { success: true, fullName: `Usuario Simulado ${dni}`, dni };
  }
}
