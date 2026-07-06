import { Injectable } from '@nestjs/common';

// Multiplicadores por categoría (Sección 4 de la especificación)
export const CATEGORY_MULTIPLIER: Record<string, number> = {
  ESTANDAR: 1.0,
  CONFORT: 1.15,
  XL: 1.6,
};

@Injectable()
export class PricingService {
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const rawDistance = R * c;
    return Number((rawDistance * 1.4).toFixed(2)); // 1.4 factor vial Lima
  }

  estimateDuration(distanceKm: number): number {
    // Average speed of 18 km/h in Lima
    return Math.round((distanceKm / 18) * 60);
  }

  calculateFare(
    distanceKm: number,
    durationMin: number,
    category: string = 'ESTANDAR',
    date: Date = new Date(),
  ): {
    subtotal: number;
    surgeMultiplier: number;
    categoryMultiplier: number;
    surgeReason: string;
    platformFee: number;
    total: number;
  } {
    // Fórmula base: 1.5 + (km * 1.2) + (min * 0.12) + 0.8 (cargo de servicio)
    const base = 1.50;
    const perKm = distanceKm * 1.20;
    const perMin = durationMin * 0.12;
    const service = 0.80;
    const subtotal = base + perKm + perMin + service;

    // Surge pricing temporal
    const hour = date.getHours();
    let surge = 1.0;
    let surgeReason = 'NORMAL';
    // Nocturno ×1.30 (22:00 — 06:00)
    if (hour >= 22 || hour < 6) {
      surge = 1.30;
      surgeReason = 'NOCTURNO';
    }
    // Hora punta ×1.20 (07:00-09:00 y 17:00-20:00)
    else if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)) {
      surge = 1.20;
      surgeReason = 'HORA_PUNTA';
    }

    // Multiplicador por categoría (Estándar 1.0 / Confort 1.15 / XL 1.6)
    const categoryMultiplier = CATEGORY_MULTIPLIER[category] ?? 1.0;

    // Suelo de tarifa: mínimo S/ 5.00 sobre el TOTAL final
    let total = subtotal * surge * categoryMultiplier;
    if (total < 5.00) total = 5.00;
    total = Number(total.toFixed(2));

    const platformFee = Number((total * 0.15).toFixed(2)); // 15% comisión plataforma

    return {
      subtotal: Number(subtotal.toFixed(2)),
      surgeMultiplier: surge,
      categoryMultiplier,
      surgeReason,
      platformFee,
      total,
    };
  }
}
