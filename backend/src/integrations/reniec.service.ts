import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DniResult {
  success: boolean;
  fullName: string;
  dni: string;
  firstName?: string;
  lastNameP?: string;
  lastNameM?: string;
  address?: string;
  source: 'RENIEC' | 'MOCK' | 'CACHE';
}

interface CacheEntry {
  value: DniResult;
  expiresAt: number;
}

@Injectable()
export class ReniecService {
  private readonly logger = new Logger(ReniecService.name);

  // Caché en memoria (reemplaza a Redis para el MVP). TTL 24h.
  private readonly cache = new Map<string, CacheEntry>();
  private static readonly TTL_MS = 24 * 60 * 60 * 1000;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Verifica un DNI contra el proveedor real (miapi.cloud). Cachea resultados
   * exitosos. Si no hay token configurado, cae a un mock de desarrollo.
   */
  async verifyDni(dni: string): Promise<DniResult> {
    // 1. Caché
    const cached = this.cache.get(dni);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.value, source: 'CACHE' };
    }

    const token = this.configService.get<string>('RENIEC_API_TOKEN');
    const baseUrl =
      this.configService.get<string>('RENIEC_API_URL') || 'https://miapi.cloud/v1/dni';

    // 2. Sin token real → mock de desarrollo
    if (!token || token === 'TU_TOKEN_AQUI') {
      this.logger.warn(`RENIEC sin token: usando mock para DNI ${dni}`);
      return this.mock(dni);
    }

    // 3. Llamada real
    try {
      const res = await fetch(`${baseUrl}/${dni}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(12000),
      });
      const json: any = await res.json();

      if (!res.ok || json?.error || json?.success === false || !json?.datos) {
        this.logger.warn(`RENIEC no encontró/validó DNI ${dni}: ${json?.error ?? res.status}`);
        return { success: false, fullName: '', dni, source: 'RENIEC' };
      }

      const d = json.datos;
      const fullName = [d.nombres, d.ape_paterno, d.ape_materno]
        .filter(Boolean)
        .join(' ')
        .trim();

      const result: DniResult = {
        success: true,
        fullName,
        dni: d.dni ?? dni,
        firstName: d.nombres,
        lastNameP: d.ape_paterno,
        lastNameM: d.ape_materno,
        address: d.domiciliado?.direccion,
        source: 'RENIEC',
      };

      this.cache.set(dni, { value: result, expiresAt: Date.now() + ReniecService.TTL_MS });
      return result;
    } catch (err: any) {
      // Error de red/timeout: no podemos verificar. No inventamos identidad.
      this.logger.error(`Error llamando a RENIEC (${dni}): ${err.message}`);
      return { success: false, fullName: '', dni, source: 'RENIEC' };
    }
  }

  // Mock de desarrollo (solo si no hay token configurado).
  private mock(dni: string): DniResult {
    const mockDb: Record<string, string> = {
      '98765432': 'Carlos Mendoza',
      '97654321': 'María Quispe',
      '96543210': 'Pedro Huamán',
      '91234567': 'Jorge Del Solar',
      '92345678': 'Ana García',
    };
    return {
      success: true,
      fullName: mockDb[dni] ?? `Usuario Simulado ${dni}`,
      dni,
      source: 'MOCK',
    };
  }
}
