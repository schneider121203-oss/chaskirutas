import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route, Trip, Booking, Passenger } from '../entities';
import { CreateCollectiveDto, JoinCollectiveDto } from './dto';
import { RouteModality, TripStatus, BookingStatus } from '../common/enums';
import { ReniecService } from '../integrations/reniec.service';
import { CulqiService } from '../integrations/culqi.service';

@Injectable()
export class CollectivesService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepo: Repository<Route>,
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Passenger)
    private readonly passengerRepo: Repository<Passenger>,
    private readonly reniecService: ReniecService,
    private readonly culqiService: CulqiService,
  ) {}

  async getCollectives() {
    return this.routeRepo.find({
      where: [
        { modality: RouteModality.COLECTIVO_M1 },
        { modality: RouteModality.COLECTIVO_M2 },
      ],
      relations: { jurisdiction: true, company: true },
    });
  }

  async createCollective(dto: CreateCollectiveDto) {
    const route = this.routeRepo.create({
      code: dto.code,
      name: dto.name,
      modality: dto.modality,
      companyId: 1, // Default main ChaskiRutas S.A.C
      jurisdictionId: dto.jurisdictionId,
      originDistrictId: dto.originDistrictId,
      destinationDistrictId: dto.destinationDistrictId,
      distanceKm: dto.distanceKm,
      baseFarePen: dto.baseFarePen,
      seatsPerUnit: dto.seatsPerUnit,
      isActive: true,
    });

    try {
      return await this.routeRepo.save(route);
    } catch (err: any) {
      // Catch SQL trigger restriction (enforce_collective_ban_lima)
      if (err.message && err.message.includes('El colectivo está prohibido por la ATU')) {
        throw new BadRequestException(
          'RESTRICCIÓN LEGAL: No se puede registrar colectivos en Lima Metropolitana/Callao. Modalidad prohibida por la ATU.'
        );
      }
      throw new BadRequestException(`Error al guardar colectivo: ${err.message}`);
    }
  }

  async joinCollective(routeId: number, passengerId: string, dto: JoinCollectiveDto) {
    const route = await this.routeRepo.findOne({ where: { id: routeId } });
    if (!route) throw new NotFoundException('Colectivo no encontrado');

    // 1. Verificación DNI via RENIEC (sin costo)
    const rVerification = await this.reniecService.verifyDni(dto.dni);
    if (!rVerification.success) {
      throw new BadRequestException('Error al verificar DNI del pasajero con RENIEC');
    }

    // 2. Buscar viaje interprovincial activo y VALIDAR disponibilidad
    //    ANTES de cobrar (evita cobrar el depósito si el colectivo está lleno).
    let trip = await this.tripRepo.findOne({
      where: { routeId: route.id, status: TripStatus.RESERVADO },
    });
    if (trip && trip.seatsAvailable <= 0) {
      throw new BadRequestException('El colectivo interprovincial se encuentra lleno');
    }

    // 3. Calcular y cobrar depósito 30% (ya confirmamos que hay asiento)
    const depositAmount = Number((route.baseFarePen * 0.3).toFixed(2));
    const cPayment = await this.culqiService.processPayment(depositAmount, dto.paymentToken);
    if (!cPayment.success) {
      throw new BadRequestException('Error al realizar el depósito del 30% con la pasarela de pagos');
    }

    // 4. Confirmar el viaje: crear si no existía, o descontar el asiento.
    //    Nota: para alta concurrencia real conviene envolver 3-4 en una
    //    transacción con bloqueo pesimista del asiento.
    if (!trip) {
      // El conductor programa el viaje en producción. Para el demo se auto-crea.
      // Carlos Mendoza (+51987654321) como conductor por defecto.
      const driver = await this.passengerRepo.manager.createQueryBuilder('User', 'u')
        .where('u.phone_e164 = :phone', { phone: '+51987654321' })
        .getRawOne();

      const driverId = driver ? driver.u_id : passengerId; // fallback

      trip = this.tripRepo.create({
        routeId: route.id,
        vehicleId: '00000000-0000-0000-0000-000000000000', // Mock UUID
        driverId,
        scheduledDeparture: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
        seatsTotal: route.seatsPerUnit,
        seatsAvailable: route.seatsPerUnit - 1,
        baseFarePen: route.baseFarePen,
        status: TripStatus.RESERVADO,
      });
      trip = await this.tripRepo.save(trip);
    } else {
      trip.seatsAvailable -= 1;
      await this.tripRepo.save(trip);
    }

    // 5. Generar la reserva
    const seatNumber = route.seatsPerUnit - trip.seatsAvailable;
    const booking = this.bookingRepo.create({
      tripId: trip.id,
      passengerId,
      seatNumber,
      farePen: route.baseFarePen,
      insurancePen: 0,
      platformFeePen: Number((route.baseFarePen * 0.15).toFixed(2)),
      totalPen: route.baseFarePen,
      status: BookingStatus.CONFIRMADO,
    });
    
    await this.bookingRepo.save(booking);

    return {
      success: true,
      bookingId: booking.id,
      seatNumber,
      verification: rVerification.fullName,
      chargeId: cPayment.transactionId,
      depositCollectedPen: depositAmount,
      remainingAmountPen: route.baseFarePen - depositAmount,
    };
  }
}
