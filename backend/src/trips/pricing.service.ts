import { Injectable } from '@nestjs/common';

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

  calculateFare(distanceKm: number, durationMin: number, date: Date = new Date()): {
    subtotal: number;
    platformFee: number;
    total: number;
  } {
    const base = 1.50;
    const perKm = distanceKm * 1.20;
    const perMin = durationMin * 0.12;
    const service = 0.80;

    let subtotal = base + perKm + perMin + service;
    if (subtotal < 5.00) subtotal = 5.00;

    const hour = date.getHours();
    let multiplier = 1.0;

    // Multiplier nocturno ×1.30 (22:00 — 06:00)
    if (hour >= 22 || hour < 6) {
      multiplier = 1.30;
    }
    // Multiplier hora punta ×1.20 (07:00-09:00 y 17:00-20:00)
    else if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)) {
      multiplier = 1.20;
    }

    const total = Number((subtotal * multiplier).toFixed(2));
    const platformFee = Number((total * 0.15).toFixed(2)); // 15% platform commission

    return {
      subtotal: total,
      platformFee,
      total,
    };
  }
}
