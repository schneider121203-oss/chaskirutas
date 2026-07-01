import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip, Booking, TripLocation, Rating, Route, User, DriverEarning, Invoice, Company } from '../entities';
import { EstimateTripDto, RequestTripDto, RateTripDto, StreamLocationDto } from './dto';
import { PricingService } from './pricing.service';
import { TripStatus, BookingStatus, InvoiceType, DriverStatus } from '../common/enums';
import { NubefactService } from '../integrations/nubefact.service';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(TripLocation)
    private readonly locationRepo: Repository<TripLocation>,
    @InjectRepository(Rating)
    private readonly ratingRepo: Repository<Rating>,
    @InjectRepository(Route)
    private readonly routeRepo: Repository<Route>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DriverEarning)
    private readonly earningRepo: Repository<DriverEarning>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly pricingService: PricingService,
    private readonly nubefactService: NubefactService,
  ) {}

  async estimate(dto: EstimateTripDto) {
    const distance = this.pricingService.calculateDistance(
      dto.startLat,
      dto.startLng,
      dto.endLat,
      dto.endLng,
    );
    const duration = this.pricingService.estimateDuration(distance);
    const fare = this.pricingService.calculateFare(distance, duration);

    return {
      distanceKm: distance,
      durationMinutes: duration,
      farePEN: fare.total,
      breakdown: {
        subtotal: fare.subtotal,
        platformFee: fare.platformFee,
      },
    };
  }

  async getTrip(id: string) {
    const trip = await this.tripRepo.findOne({
      where: { id },
      relations: { route: true, vehicle: true, driver: { user: true } },
    });
    if (!trip) throw new NotFoundException('Viaje no encontrado');
    return trip;
  }

  async requestTrip(userId: string, dto: RequestTripDto) {
    const route = await this.routeRepo.findOne({ where: { id: dto.routeId } });
    if (!route) throw new NotFoundException('Ruta no encontrada');

    // Simulate match or search flow. We create the trip in database.
    // Encontrar dinámicamente al conductor activo más reciente en la base de datos
    const activeDriverUser = await this.userRepo.findOne({
      where: {
        driver: {
          status: DriverStatus.ACTIVO,
        },
      },
      relations: { driver: true },
      order: { createdAt: 'DESC' },
    });

    if (!activeDriverUser || !activeDriverUser.driver) {
      throw new BadRequestException('No hay conductores activos formalizados en la base de datos. Completa la formalización primero.');
    }
    const driverUser = activeDriverUser;

    // Find driver vehicle
    const vehicle = await this.tripRepo.manager.createQueryBuilder('Vehicle', 'v')
      .where('v.owner_user_id = :driverId', { driverId: driverUser.id })
      .getRawOne();

    const vehicleId = vehicle ? vehicle.v_id : '00000000-0000-0000-0000-000000000000'; // Fallback UUID

    const trip = this.tripRepo.create({
      routeId: dto.routeId,
      vehicleId: vehicleId,
      driverId: driverUser.id,
      scheduledDeparture: new Date(),
      seatsTotal: 4,
      seatsAvailable: 3,
      baseFarePen: dto.proposedFare,
      status: TripStatus.RESERVADO,
      startedLat: dto.startLat,
      startedLng: dto.startLng,
      endedLat: dto.endLat,
      endedLng: dto.endLng,
    });

    const savedTrip = await this.tripRepo.save(trip);

    // Create a booking for this passenger
    const booking = this.bookingRepo.create({
      tripId: savedTrip.id,
      passengerId: userId,
      seatNumber: 1,
      farePen: dto.proposedFare,
      totalPen: dto.proposedFare,
      status: BookingStatus.CONFIRMADO,
    });
    await this.bookingRepo.save(booking);

    return {
      trip: savedTrip,
      bookingId: booking.id,
      driver: {
        id: driverUser.id,
        fullName: driverUser.fullName,
        phone: driverUser.phoneE164,
        rating: driverUser.driver.ratingAvg,
      },
    };
  }

  async updateStatus(id: string, status: TripStatus) {
    const trip = await this.getTrip(id);
    trip.status = status;
    
    if (status === TripStatus.EN_CAMINO) {
      trip.actualDeparture = new Date();
    } else if (status === TripStatus.COMPLETADO) {
      trip.actualArrival = new Date();
      
      // Calculate real stats
      trip.distanceKmReal = this.pricingService.calculateDistance(
        Number(trip.startedLat), Number(trip.startedLng),
        Number(trip.endedLat), Number(trip.endedLng)
      );
      trip.durationMinutesReal = this.pricingService.estimateDuration(trip.distanceKmReal);

      // Trigger Earning and SUNAT Invoice generation
      await this.processTripCompletion(trip);
    }
    
    trip.updatedAt = new Date();
    return this.tripRepo.save(trip);
  }

  async streamLocation(id: string, dto: StreamLocationDto) {
    const log = this.locationRepo.create({
      tripId: id,
      capturedAt: new Date(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      speedKmh: dto.speedKmh || null,
      headingDeg: dto.headingDeg || null,
    });
    return this.locationRepo.save(log);
  }

  async rateTrip(bookingId: string, raterUserId: string, dto: RateTripDto) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: { trip: true },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');

    // Determine target user id
    const isPassenger = booking.passengerId === raterUserId;
    const ratedUserId = isPassenger ? booking.trip.driverId : booking.passengerId;
    const roleOfRater = isPassenger ? 'PASAJERO' : 'CONDUCTOR';

    const rating = this.ratingRepo.create({
      bookingId,
      raterUserId,
      ratedUserId,
      roleOfRater,
      score: dto.score,
      tags: dto.tags || null,
      comment: dto.comment || null,
    });

    return this.ratingRepo.save(rating);
  }

  async getHistory(userId: string) {
    return this.bookingRepo.find({
      where: { passengerId: userId },
      relations: { trip: { route: true, driver: { user: true } } },
      order: { bookedAt: 'DESC' },
    });
  }

  // Completes booking lifecycle: Earning + Nubefact Invoice
  private async processTripCompletion(trip: Trip) {
    const bookings = await this.bookingRepo.find({
      where: { tripId: trip.id, status: BookingStatus.CONFIRMADO },
      relations: { passenger: { user: true } },
    });

    for (const booking of bookings) {
      booking.status = BookingStatus.COMPLETADO;
      booking.droppedOffAt = new Date();
      await this.bookingRepo.save(booking);

      // 1. Driver Earnings line
      const gross = Number(booking.totalPen);
      const platformFee = Number((gross * 0.15).toFixed(2));
      const net = gross - platformFee;

      const earning = this.earningRepo.create({
        driverId: trip.driverId,
        tripId: trip.id,
        grossPen: gross,
        platformFeePen: platformFee,
        affiliationFeePen: 0,
        netPen: net,
      });
      await this.earningRepo.save(earning);

      // 2. SUNAT Invoice generation
      const defaultCompany = await this.companyRepo.findOne({ where: { id: 1 } });
      if (defaultCompany) {
        const doc = booking.passenger.user.dni;
        const name = booking.passenger.user.fullName;

        const inv = await this.nubefactService.generateInvoice({
          dniOrRuc: doc,
          fullName: name,
          amount: gross,
          description: `Servicio de transporte ChaskiRutas. Ruta: ${trip.route?.name || 'Provincial'}`,
        });

        if (inv.success) {
          const invoice = this.invoiceRepo.create({
            bookingId: booking.id,
            companyId: defaultCompany.id,
            type: InvoiceType.BOLETA,
            series: inv.series,
            number: inv.number,
            customerDocType: doc.length === 8 ? 'DNI' : 'RUC',
            customerDoc: doc,
            customerName: name,
            subtotalPen: Number((gross / 1.18).toFixed(2)),
            igvPen: Number((gross - gross / 1.18).toFixed(2)),
            totalPen: gross,
            sunatStatus: 'ACEPTADO',
            pdfUrl: inv.pdfUrl,
            xmlUrl: inv.xmlUrl,
            sunatResponse: { code: '0', description: 'La boleta ha sido aceptada por SUNAT' },
          });
          await this.invoiceRepo.save(invoice);
        }
      }
    }
  }

  async getCurrentRequest(driverId: string) {
    const trip = await this.tripRepo.findOne({
      where: {
        driverId,
        status: TripStatus.RESERVADO,
      },
      relations: { route: true },
    });
    if (!trip) return null;

    const booking = await this.bookingRepo.findOne({
      where: { tripId: trip.id },
      relations: { passenger: { user: true } },
    });

    return {
      trip,
      booking,
    };
  }
}
