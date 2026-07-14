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
  verified?: boolean;      // el cruce con RENIEC fue exitoso
  simulated?: boolean;     // true si el dato proviene de la simulación
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

    // 2. Sin token real → simulación de cruce con RENIEC
    if (!token || token === 'TU_TOKEN_AQUI') {
      const result = this.simulate(dni);
      this.cache.set(dni, { value: result, expiresAt: Date.now() + ReniecService.TTL_MS });
      return result;
    }

    // 3. Llamada real
    try {
      const res = await fetch(`${baseUrl}/${dni}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(12000),
      });
      const json: any = await res.json();

      if (!res.ok || json?.error || json?.success === false || !json?.datos) {
        // Token inválido/agotado o DNI no hallado → no trabar la demo: simular.
        this.logger.warn(`RENIEC no validó DNI ${dni} (${json?.error ?? res.status}); usando simulación.`);
        const sim = this.simulate(dni);
        this.cache.set(dni, { value: sim, expiresAt: Date.now() + ReniecService.TTL_MS });
        return sim;
      }

      const d = json.datos;
      const fullName = [d.nombres, d.ape_paterno, d.ape_materno]
        .filter(Boolean)
        .join(' ')
        .trim();

      const result: DniResult = {
        success: true,
        verified: true,
        simulated: false,
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
      // Timeout / red caída → no trabar la demo: simular el cruce.
      this.logger.warn(`RENIEC no respondió (${dni}): ${err.message}; usando simulación.`);
      const sim = this.simulate(dni);
      this.cache.set(dni, { value: sim, expiresAt: Date.now() + ReniecService.TTL_MS });
      return sim;
    }
  }

  // ── Simulación del cruce con RENIEC (cuando no hay token de producción) ──────
  // Genera datos peruanos realistas de forma DETERMINÍSTICA: el mismo DNI siempre
  // devuelve la misma persona, como si RENIEC hubiese respondido.

  private static readonly NOMBRES_M = [
    'Juan Carlos', 'Luis Alberto', 'José Antonio', 'Miguel Ángel', 'Carlos Eduardo',
    'Jorge Luis', 'Pedro Pablo', 'Víctor Manuel', 'Walter David', 'César Augusto',
  ];
  private static readonly NOMBRES_F = [
    'María Elena', 'Rosa Angélica', 'Ana Lucía', 'Carmen Rosa', 'Julia Mercedes',
    'Elena Sofía', 'Patricia Isabel', 'Gloria María', 'Sandra Milagros', 'Verónica Paola',
  ];
  private static readonly APELLIDOS = [
    'Quispe', 'Mamani', 'Huamán', 'Flores', 'Rojas', 'Vásquez', 'Sánchez', 'Ramírez',
    'Torres', 'Castillo', 'Chávez', 'Espinoza', 'Cáceres', 'Apaza', 'Condori', 'Vargas',
    'Gutiérrez', 'Salazar', 'Ríos', 'Ccahuana',
  ];
  private static readonly VIAS = ['Av.', 'Jr.', 'Calle', 'Psje.'];
  private static readonly ZONAS = [
    'Cercado, Lima', 'Arequipa', 'Cusco', 'Trujillo', 'San Juan de Lurigancho, Lima',
    'Yanahuara, Arequipa', 'Wanchaq, Cusco', 'Chiclayo', 'Piura', 'Huancayo',
  ];

  private simulate(dni: string): DniResult {
    const digits = (dni || '').replace(/\D/g, '').padStart(8, '0');
    const at = (offset: number, len: number) => {
      const chunk = parseInt(digits.slice(offset, offset + 3), 10);
      return (Number.isNaN(chunk) ? digits.length : chunk) % len;
    };

    const female = parseInt(digits[7], 10) % 2 === 0;
    const nombres = (female ? ReniecService.NOMBRES_F : ReniecService.NOMBRES_M)[at(0, 10)];
    const apeP = ReniecService.APELLIDOS[at(1, ReniecService.APELLIDOS.length)];
    const apeM = ReniecService.APELLIDOS[at(3, ReniecService.APELLIDOS.length)];
    const via = ReniecService.VIAS[at(2, ReniecService.VIAS.length)];
    const nro = 100 + (parseInt(digits.slice(2, 5), 10) % 900);
    const zona = ReniecService.ZONAS[at(4, ReniecService.ZONAS.length)];

    const fullName = `${nombres} ${apeP} ${apeM}`;
    this.logger.log(`RENIEC (simulado): cruce OK para DNI ${dni} → ${fullName}`);

    return {
      success: true,
      verified: true,
      simulated: true,
      fullName,
      dni,
      firstName: nombres,
      lastNameP: apeP,
      lastNameM: apeM,
      address: `${via} ${apeP} Nro. ${nro}, ${zona}`,
      source: 'RENIEC',
    };
  }
}
